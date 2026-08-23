import { prisma } from '../lib/prisma.js'
import { ApiError } from '../utils/errors.js'
import { assertTransition } from './projectStateMachine.js'
import { paymentProvider } from './payments/index.js'
import {
  publicationFee,
  escrowFeeDue,
  escrowCharge,
  settlement,
  canReceivePayout,
  daysFromNow,
  RULES,
} from './pricing.js'

// После 3 успешных сделок фрилансер получает статус «Проверенный»
const VERIFIED_DEALS_THRESHOLD = 3

// Публикация без эскроу. Комиссия берется вперед — до первого отклика, — поэтому
// увод сделки мимо платформы заказчику уже ничего не экономит. В бесплатный период
// комиссия равна нулю, и проект публикуется сразу.
export async function publishProject(project) {
  const fee = publicationFee(project.budget)
  if (fee === 0) {
    assertTransition(project.status, 'OPEN')
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'OPEN', publishedAt: new Date() },
    })
    return {}
  }

  assertTransition(project.status, 'PENDING_PAYMENT')
  const charge = await paymentProvider.hold({
    amount: fee,
    currency: project.currency,
    description: `TrustWork: публикация проекта «${project.title}»`,
  })

  // Redirect-флоу: проект ждет, пока заказчик подтвердит оплату у банка
  if (charge.confirmationUrl) {
    await prisma.$transaction(async (tx) => {
      await createTransaction(tx, project, { kind: 'FEE', amount: fee, status: 'PENDING', charge })
      await tx.project.update({ where: { id: project.id }, data: { status: 'PENDING_PAYMENT' } })
    })
    return { confirmationUrl: charge.confirmationUrl }
  }

  await paymentProvider.capture(charge.externalId)
  await prisma.$transaction(async (tx) => {
    await createTransaction(tx, project, { kind: 'FEE', amount: fee, status: 'RELEASED', charge })
    await tx.project.update({
      where: { id: project.id },
      data: { status: 'OPEN', publishedAt: new Date(), feePaid: project.feePaid + fee },
    })
  })
  return {}
}

// Заморозка бюджета. С заказчика списывается бюджет плюс комиссия сверху,
// исполнителю уходит бюджет целиком. Уплаченное за публикацию засчитывается.
export async function fundProject(project) {
  assertTransition(project.status, 'FUNDED')
  const fee = escrowFeeDue(project.budget, project.feePaid)
  const total = escrowCharge(project.budget, project.feePaid)

  const hold = await paymentProvider.hold({
    amount: total,
    currency: project.currency,
    description: `TrustWork: эскроу по проекту «${project.title}»`,
  })

  const status = hold.confirmationUrl ? 'PENDING' : 'HOLDED'
  await prisma.$transaction(async (tx) => {
    await createTransaction(tx, project, {
      kind: 'ESCROW',
      amount: project.budget,
      status,
      charge: hold,
    })
    if (fee > 0) {
      await createTransaction(tx, project, { kind: 'FEE', amount: fee, status, charge: hold })
    }
    await tx.project.update({
      where: { id: project.id },
      data: hold.confirmationUrl
        ? { status: 'PENDING_PAYMENT' }
        : { status: 'FUNDED', publishedAt: project.publishedAt ?? new Date() },
    })
  })
  return hold.confirmationUrl ? { confirmationUrl: hold.confirmationUrl } : {}
}

// Приемка работы заказчиком. Односторонняя: подтверждение исполнителя не нужно.
// Без эскроу — просто завершение, расчеты идут мимо платформы и ее не касаются.
export async function acceptWork(project) {
  const held = await heldEscrow(project.id)
  if (!held) {
    assertTransition(project.status, 'COMPLETED')
    return prisma.project.update({
      where: { id: project.id },
      data: { status: 'COMPLETED', acceptedAt: new Date() },
    })
  }

  await paymentProvider.capture(held.externalId)
  await prisma.transaction.updateMany({
    where: { projectId: project.id, kind: 'FEE', status: 'HOLDED' },
    data: { status: 'RELEASED' },
  })

  const freelancer = project.freelancerId
    ? await prisma.user.findUnique({ where: { id: project.freelancerId } })
    : null

  // Платформа платит только самозанятым и ИП. Без статуса деньги ждут на счете:
  // это самый убедительный момент, чтобы человек его оформил.
  if (!canReceivePayout(freelancer)) {
    assertTransition(project.status, 'AWAITING_PAYOUT')
    return prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'AWAITING_PAYOUT',
        acceptedAt: new Date(),
        payoutDueAt: daysFromNow(RULES.payoutStatusDays),
      },
    })
  }

  return releaseToFreelancer(project, held, project.budget)
}

// Выплата исполнителю: деньги уходят, проект закрывается, сделка идет в статистику
export async function releaseToFreelancer(project, held, amount) {
  await paymentProvider.payout({
    amount,
    currency: project.currency,
    userId: project.freelancerId,
    description: `TrustWork: оплата по проекту «${project.title}»`,
  })

  return prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: held.id },
      data: { status: 'RELEASED', amount },
    })
    const updated = await tx.project.update({
      where: { id: project.id },
      data: { status: 'COMPLETED', acceptedAt: project.acceptedAt ?? new Date(), payoutDueAt: null },
    })
    if (project.freelancerId) {
      const freelancer = await tx.user.update({
        where: { id: project.freelancerId },
        data: { completedDeals: { increment: 1 } },
      })
      if (!freelancer.isVerified && freelancer.completedDeals >= VERIFIED_DEALS_THRESHOLD) {
        await tx.user.update({ where: { id: freelancer.id }, data: { isVerified: true } })
      }
    }
    return updated
  })
}

// Исполнитель оформил статус, пока деньги ждали, — доводим выплату до конца
export async function payoutAwaiting(project) {
  const captured = await prisma.transaction.findFirst({
    where: { projectId: project.id, kind: 'ESCROW', status: 'RELEASED' },
  })
  if (!captured) throw new ApiError(409, 'По проекту нет денег к выплате')
  return releaseToFreelancer(project, captured, captured.amount)
}

// Отмена проекта: снимаем холд и возвращаем деньги заказчику
export async function refundEscrow(project) {
  assertTransition(project.status, 'CANCELLED')
  const held = await heldEscrow(project.id)
  if (held) await paymentProvider.cancel(held.externalId)

  return prisma.$transaction(async (tx) => {
    await tx.transaction.updateMany({
      where: { projectId: project.id, status: { in: ['HOLDED', 'PENDING'] } },
      data: { status: 'REFUNDED' },
    })
    return tx.project.update({
      where: { id: project.id },
      data: { status: 'CANCELLED', cancelRequestedById: null, cancelRequestedAt: null },
    })
  })
}

// Возврат комиссии за публикацию: неделя без откликов или отказ в первые сутки
export async function refundPublicationFee(project) {
  const fee = await prisma.transaction.findFirst({
    where: { projectId: project.id, kind: 'FEE', status: 'RELEASED' },
  })
  if (!fee) return null
  await paymentProvider.refund(fee.externalId, fee.amount)
  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({ where: { id: fee.id }, data: { status: 'REFUNDED' } })
    await tx.project.update({ where: { id: project.id }, data: { feePaid: 0 } })
  })
  return fee.amount
}

// Решение поддержки по спору: исполнителю уходит часть работы, остальное
// возвращается заказчику. Комиссия берется только с выплаченной части.
export async function settleDispute(project, paidOut) {
  const escrow = await prisma.transaction.findFirst({
    where: { projectId: project.id, kind: 'ESCROW', status: { in: ['HOLDED', 'RELEASED'] } },
  })
  if (!escrow) throw new ApiError(409, 'По проекту нет замороженных денег')

  const result = settlement(project.budget, project.feePaid, paidOut)
  if (escrow.status === 'HOLDED') await paymentProvider.capture(escrow.externalId)
  if (result.payout > 0) {
    await paymentProvider.payout({
      amount: result.payout,
      currency: project.currency,
      userId: project.freelancerId,
      description: `TrustWork: решение по спору, проект «${project.title}»`,
    })
  }
  if (result.refund > 0) await paymentProvider.refund(escrow.externalId, result.refund)

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: escrow.id },
      data: { status: result.payout > 0 ? 'RELEASED' : 'REFUNDED', amount: result.payout },
    })
    if (result.refund > 0) {
      await tx.transaction.create({
        data: {
          projectId: project.id,
          kind: 'ESCROW',
          amount: result.refund,
          currency: project.currency,
          status: 'REFUNDED',
          provider: paymentProvider.name,
          externalId: escrow.externalId,
        },
      })
    }
    await tx.transaction.updateMany({
      where: { projectId: project.id, kind: 'FEE', status: 'HOLDED' },
      data: { status: result.fee > 0 ? 'RELEASED' : 'REFUNDED' },
    })
  })
  return result
}

async function heldEscrow(projectId) {
  return prisma.transaction.findFirst({
    where: { projectId, kind: 'ESCROW', status: 'HOLDED' },
  })
}

function createTransaction(tx, project, { kind, amount, status, charge }) {
  return tx.transaction.create({
    data: {
      projectId: project.id,
      kind,
      amount,
      currency: project.currency,
      status,
      provider: paymentProvider.name,
      externalId: charge.externalId,
    },
  })
}

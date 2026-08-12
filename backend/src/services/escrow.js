import { prisma } from '../lib/prisma.js'
import { ApiError } from '../utils/errors.js'
import { assertTransition } from './projectStateMachine.js'
import { paymentProvider } from './payments/index.js'

// После 3 успешных сделок фрилансер получает статус «Проверенный»
const VERIFIED_DEALS_THRESHOLD = 3

// Заморозка бюджета: холд у платежного провайдера → Transaction(HOLDED) → проект FUNDED
export async function fundProject(project) {
  assertTransition(project.status, 'FUNDED')
  const { externalId } = await paymentProvider.hold({
    amount: project.budget,
    currency: project.currency,
  })
  return prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        projectId: project.id,
        amount: project.budget,
        currency: project.currency,
        status: 'HOLDED',
        provider: paymentProvider.name,
        externalId,
      },
    })
    return tx.project.update({ where: { id: project.id }, data: { status: 'FUNDED' } })
  })
}

// Приемка работы заказчиком. С эскроу — выплата и рост статистики фрилансера;
// без эскроу — просто завершение (статус «Проверенный» засчитывают только сделки с эскроу).
export async function completeProject(project) {
  assertTransition(project.status, 'COMPLETED')
  const held = await prisma.transaction.findFirst({
    where: { projectId: project.id, status: 'HOLDED' },
  })
  if (held) return releaseEscrow(project)
  return prisma.project.update({ where: { id: project.id }, data: { status: 'COMPLETED' } })
}

// Приемка работы заказчиком: capture платежа → Transaction RELEASED → проект COMPLETED
export async function releaseEscrow(project) {
  assertTransition(project.status, 'COMPLETED')
  const held = await getHeldTransaction(project.id)
  await paymentProvider.capture(held.externalId)
  return prisma.$transaction(async (tx) => {
    await tx.transaction.update({ where: { id: held.id }, data: { status: 'RELEASED' } })
    const updated = await tx.project.update({
      where: { id: project.id },
      data: { status: 'COMPLETED' },
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

// Отмена проекта: cancel холда (если был) → Transaction REFUNDED → проект CANCELLED
export async function refundEscrow(project) {
  assertTransition(project.status, 'CANCELLED')
  const held = await prisma.transaction.findFirst({
    where: { projectId: project.id, status: 'HOLDED' },
  })
  if (held) {
    await paymentProvider.cancel(held.externalId)
  }
  return prisma.$transaction(async (tx) => {
    if (held) {
      await tx.transaction.update({ where: { id: held.id }, data: { status: 'REFUNDED' } })
    }
    return tx.project.update({ where: { id: project.id }, data: { status: 'CANCELLED' } })
  })
}

async function getHeldTransaction(projectId) {
  const held = await prisma.transaction.findFirst({
    where: { projectId, status: 'HOLDED' },
  })
  if (!held) throw new ApiError(409, 'Не найден замороженный платеж по проекту')
  return held
}

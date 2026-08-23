import { prisma } from '../lib/prisma.js'
import { refundPublicationFee } from './escrow.js'
import { publicationRefundReason, RULES } from './pricing.js'
import { notifyFeeRefunded, notifyPayoutStatusRequired } from './notifications.js'

// Раз в час проверяем то, что зависит от времени, а не от действий пользователя:
// сроки возврата комиссии, напоминания о статусе и передачу споров поддержке.
const INTERVAL_MS = 60 * 60 * 1000

// На какой день после приемки напоминаем исполнителю про самозанятость
const PAYOUT_REMINDER_DAYS = [1, 7, 14, 25]

export function startMaintenance() {
  const tick = () =>
    runMaintenance().catch((e) => console.error('[maintenance]', e.message))
  // Первый прогон — сразу после старта: сервер мог простоять всю ночь
  tick()
  const timer = setInterval(tick, INTERVAL_MS)
  timer.unref?.()
  return timer
}

export async function runMaintenance(now = new Date()) {
  const [refunded, reminded, escalated] = await Promise.all([
    refundUnansweredPublications(now),
    remindAboutPayoutStatus(now),
    escalateDisputes(now),
  ])
  if (refunded || reminded || escalated) {
    console.log(
      `[maintenance] возвраты: ${refunded}, напоминания: ${reminded}, споров к поддержке: ${escalated}`,
    )
  }
  return { refunded, reminded, escalated }
}

// Неделя без единого отклика — комиссия за публикацию возвращается заказчику.
// Это цена нашего обещания: платит тот, кому платформа действительно помогла.
async function refundUnansweredPublications(now) {
  const projects = await prisma.project.findMany({
    where: { status: 'OPEN', feePaid: { gt: 0 }, publishedAt: { not: null } },
    include: { _count: { select: { applications: true } } },
  })

  let count = 0
  for (const project of projects) {
    const reason = publicationRefundReason(project, project._count.applications, now)
    if (reason !== 'NO_APPLICATIONS') continue
    try {
      const amount = await refundPublicationFee(project)
      if (amount) {
        await notifyFeeRefunded(project, amount, reason)
        count += 1
      }
    } catch (e) {
      console.error('[maintenance] возврат комиссии', project.id, e.message)
    }
  }
  return count
}

// Деньги лежат и ждут, а человек про них не помнит. Напоминаем четырежды —
// чтобы возврат заказчику через 30 дней не стал для исполнителя новостью.
async function remindAboutPayoutStatus(now) {
  const projects = await prisma.project.findMany({
    where: { status: 'AWAITING_PAYOUT', acceptedAt: { not: null } },
  })

  let count = 0
  for (const project of projects) {
    const elapsed = Math.floor((now - project.acceptedAt) / 86400000)
    if (!PAYOUT_REMINDER_DAYS.includes(elapsed)) continue

    // Один день — одно напоминание, даже если сервер перезапускали
    const alreadyToday = await prisma.notification.findFirst({
      where: {
        projectId: project.id,
        kind: 'PAYOUT_STATUS_REQUIRED',
        createdAt: { gte: new Date(now.getTime() - 20 * 3600000) },
      },
    })
    if (alreadyToday) continue

    const daysLeft = Math.max(0, RULES.payoutStatusDays - elapsed)
    await notifyPayoutStatusRequired(project, daysLeft)
    count += 1
  }
  return count
}

// Три дня на то, чтобы договориться самим, истекли — спор становится делом поддержки
async function escalateDisputes(now) {
  const { count } = await prisma.dispute.updateMany({
    where: { status: 'OPEN', supportAt: { lte: now } },
    data: { status: 'IN_SUPPORT' },
  })
  return count
}

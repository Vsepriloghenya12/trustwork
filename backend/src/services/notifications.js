import { prisma } from '../lib/prisma.js'
import { sendPush } from './push.js'
import { subscriptionMatches } from './matching.js'

// Одно событие — одна запись в списке уведомлений и один push.
export async function notify(userId, { kind, title, body, projectId, subscriptionId }) {
  const notification = await prisma.notification.create({
    data: { userId, kind, title, body, projectId, subscriptionId },
  })
  // Push не должен ронять основную операцию: упал — уведомление все равно в списке
  sendPush(userId, {
    title,
    body,
    url: projectId ? `/projects/${projectId}` : '/notifications',
    tag: notification.id,
  }).catch((e) => console.error('[notify]', e.message))
  return notification
}

function money(amount) {
  return `${amount.toLocaleString('ru-RU')} ₽`
}

// Рассылка по подпискам. Один проект дает пользователю одно уведомление,
// даже если под него подошли несколько его подписок.
export async function notifySubscribers(project, { escrowActive, reason = 'PROJECT_MATCH' }) {
  const subscriptions = await prisma.subscription.findMany({
    where: { muted: false, userId: { not: project.clientId } },
  })

  const byUser = new Map()
  for (const subscription of subscriptions) {
    if (!subscriptionMatches(subscription, project, { escrowActive })) continue
    if (!byUser.has(subscription.userId)) byUser.set(subscription.userId, subscription)
  }
  if (byUser.size === 0) return 0

  // Не шлем повторно, если человек уже получал уведомление об этом проекте
  const already = await prisma.notification.findMany({
    where: {
      projectId: project.id,
      userId: { in: [...byUser.keys()] },
      kind: { in: ['PROJECT_MATCH', 'PROJECT_ESCROW'] },
    },
    select: { userId: true },
  })
  for (const { userId } of already) byUser.delete(userId)

  await Promise.all(
    [...byUser.entries()].map(([userId, subscription]) =>
      notify(userId, {
        kind: reason,
        title:
          reason === 'PROJECT_ESCROW'
            ? `Бюджет заморожен: ${project.title}`
            : `Новый проект: ${project.title}`,
        body: `${money(project.budget)} · по подписке «${subscription.title}»`,
        projectId: project.id,
        subscriptionId: subscription.id,
      }),
    ),
  )
  return byUser.size
}

// --- Уведомления по ходу сделки ---

export function notifyInvitation(project, freelancerId, { escrowActive }) {
  return notify(freelancerId, {
    kind: 'INVITATION',
    title: `Вас пригласили: ${project.title}`,
    body: `${money(project.budget)}${escrowActive ? ' · бюджет заморожен' : ' · бюджет не заморожен'}`,
    projectId: project.id,
  })
}

export function notifyNewApplication(project, freelancerName) {
  return notify(project.clientId, {
    kind: 'APPLICATION_NEW',
    title: `Новый отклик: ${project.title}`,
    body: `${freelancerName || 'Фрилансер'} предложил себя`,
    projectId: project.id,
  })
}

export function notifyApplicationAccepted(project, freelancerId) {
  return notify(freelancerId, {
    kind: 'APPLICATION_ACCEPTED',
    title: `Вас выбрали исполнителем: ${project.title}`,
    body: `${money(project.budget)} · можно приступать`,
    projectId: project.id,
  })
}

export function notifyProjectCompleted(project, { escrowReleased }) {
  if (!project.freelancerId) return null
  return notify(project.freelancerId, {
    kind: 'PROJECT_COMPLETED',
    title: `Работа принята: ${project.title}`,
    body: escrowReleased ? `${money(project.budget)} выплачено` : 'Заказчик принял работу',
    projectId: project.id,
  })
}

export function notifySupportReply(userId, text) {
  return notify(userId, {
    kind: 'SUPPORT_REPLY',
    title: 'Ответ поддержки',
    body: text.slice(0, 120),
  })
}

export function notifyAppealResolved(userId, decision, resolution) {
  return notify(userId, {
    kind: 'APPEAL_RESOLVED',
    title:
      decision === 'ACCEPTED'
        ? 'Обжалование удовлетворено — отзыв скрыт'
        : 'Обжалование отклонено — отзыв остается',
    body: resolution || undefined,
  })
}

export function notifyMessage(message, project, senderName) {
  return notify(message.recipientId, {
    kind: 'MESSAGE',
    title: `Сообщение от ${senderName || 'собеседника'}`,
    body: `${project.title}: ${message.text.slice(0, 100)}`,
    projectId: project.id,
  })
}

// --- Деньги и разбирательства ---

export function notifyPayoutStatusRequired(project, daysLeft) {
  if (!project.freelancerId) return null
  return notify(project.freelancerId, {
    kind: 'PAYOUT_STATUS_REQUIRED',
    title: `Деньги ждут вас: ${money(project.budget)}`,
    body:
      daysLeft > 0
        ? `Чтобы получить оплату, оформите самозанятость. Осталось ${daysLeft} дн.`
        : 'Срок оформления статуса истек — разбирается поддержка',
    projectId: project.id,
  })
}

export function notifyPayoutSent(project, amount) {
  if (!project.freelancerId) return null
  return notify(project.freelancerId, {
    kind: 'PAYOUT_SENT',
    title: `Выплата отправлена: ${money(amount)}`,
    body: project.title,
    projectId: project.id,
  })
}

export function notifyCancelRequested(project, toUserId) {
  return notify(toUserId, {
    kind: 'CANCEL_REQUESTED',
    title: `Предложена отмена: ${project.title}`,
    body: 'Подтвердите отмену или откройте спор, если не согласны',
    projectId: project.id,
  })
}

export function notifyDisputeOpened(project, toUserId) {
  return notify(toUserId, {
    kind: 'DISPUTE_OPENED',
    title: `Открыт спор: ${project.title}`,
    body: 'Есть три дня, чтобы договориться в чате, дальше подключится поддержка',
    projectId: project.id,
  })
}

export function notifyDisputeResolved(project, toUserId, payout) {
  return notify(toUserId, {
    kind: 'DISPUTE_RESOLVED',
    title: `Спор решен: ${project.title}`,
    body: payout > 0 ? `Исполнителю выплачено ${money(payout)}` : 'Деньги возвращены заказчику',
    projectId: project.id,
  })
}

export function notifyFeeRefunded(project, amount, reason) {
  return notify(project.clientId, {
    kind: 'FEE_REFUNDED',
    title: `Комиссия возвращена: ${money(amount)}`,
    body:
      reason === 'NO_APPLICATIONS'
        ? `За неделю на «${project.title}» не откликнулся никто`
        : `Проект «${project.title}» отменен`,
    projectId: project.id,
  })
}

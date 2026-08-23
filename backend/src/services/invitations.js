export const MAX_INVITATIONS_PER_PROJECT = 5
const LIFETIME_DAYS = 14

// Приглашение живет 14 дней, но не дольше срока задачи: звать на работу,
// которую уже поздно делать, — только тратить время исполнителя.
export function invitationExpiry(project, now = new Date()) {
  const limit = new Date(now)
  limit.setDate(limit.getDate() + LIFETIME_DAYS)
  if (project.deadline && project.deadline < limit) return project.deadline
  return limit
}

export function isExpired(invitation, now = new Date()) {
  return invitation.status === 'SENT' || invitation.status === 'VIEWED'
    ? invitation.expiresAt < now
    : false
}

// Статус для показа: просроченные считаем истекшими, не дожидаясь фоновой чистки
export function visibleStatus(invitation, now = new Date()) {
  return isExpired(invitation, now) ? 'EXPIRED' : invitation.status
}

import { ApiError } from '../utils/errors.js'

// Жизненный цикл проекта (PROJECT_SPEC.md, раздел 11).
// Единственная точка правды для смены статусов — обход этой машины запрещен.
// OPEN — опубликован без эскроу; FUNDED — опубликован с замороженным бюджетом.
export const PROJECT_TRANSITIONS = {
  DRAFT: ['PENDING_PAYMENT', 'OPEN', 'FUNDED', 'CANCELLED'],
  // Комиссия за публикацию или заморозка бюджета ждет подтверждения оплаты
  PENDING_PAYMENT: ['OPEN', 'FUNDED', 'CANCELLED'],
  OPEN: ['PENDING_PAYMENT', 'FUNDED', 'IN_PROGRESS', 'CANCELLED'],
  FUNDED: ['IN_PROGRESS', 'CANCELLED'],
  // AWAITING_PAYOUT — работа принята, но исполнитель еще не оформил статус
  IN_PROGRESS: ['COMPLETED', 'AWAITING_PAYOUT', 'DISPUTED', 'CANCELLED'],
  AWAITING_PAYOUT: ['COMPLETED', 'DISPUTED', 'CANCELLED'],
  DISPUTED: ['COMPLETED', 'AWAITING_PAYOUT', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

export function canTransition(from, to) {
  return (PROJECT_TRANSITIONS[from] ?? []).includes(to)
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new ApiError(409, `Недопустимый переход статуса: ${from} → ${to}`)
  }
}

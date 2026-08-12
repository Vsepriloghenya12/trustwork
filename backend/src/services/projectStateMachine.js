import { ApiError } from '../utils/errors.js'

// Жизненный цикл проекта (PROJECT_SPEC.md, раздел 11).
// Единственная точка правды для смены статусов — обход этой машины запрещен.
// OPEN — опубликован без эскроу; FUNDED — опубликован с замороженным бюджетом.
export const PROJECT_TRANSITIONS = {
  DRAFT: ['OPEN', 'FUNDED', 'CANCELLED'],
  PENDING_PAYMENT: ['FUNDED', 'CANCELLED'],
  OPEN: ['PENDING_PAYMENT', 'FUNDED', 'IN_PROGRESS', 'CANCELLED'],
  FUNDED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
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

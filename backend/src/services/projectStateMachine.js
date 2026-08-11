import { ApiError } from '../utils/errors.js'

// Жизненный цикл проекта (PROJECT_SPEC.md, раздел 11).
// Единственная точка правды для смены статусов — обход этой машины запрещен.
export const PROJECT_TRANSITIONS = {
  DRAFT: ['PENDING_PAYMENT', 'FUNDED', 'CANCELLED'],
  PENDING_PAYMENT: ['FUNDED', 'CANCELLED'],
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

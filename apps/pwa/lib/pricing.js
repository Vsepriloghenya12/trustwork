// Зеркало серверных тарифов. Источник правды — backend/src/services/pricing.js;
// копия нужна, чтобы сумма пересчитывалась прямо во время набора бюджета.
// Идет ли сейчас бесплатный период, знает только сервер: GET /api/pricing.

export const PUBLICATION_FEE = { rate: 0.07, min: 300, cap: 10000 }
export const ESCROW_FEE = { rate: 0.05, min: 300, cap: null }

export const PAYOUT_STATUS_DAYS = 30
export const SILENT_FREELANCER_DAYS = 14
export const DISPUTE_CHAT_DAYS = 3

function bounded(amount, { rate, min, cap }) {
  const raw = Math.round(amount * rate)
  const withMin = Math.max(raw, min)
  return cap ? Math.min(withMin, cap) : withMin
}

export function publicationFee(budget) {
  return budget > 0 ? bounded(budget, PUBLICATION_FEE) : 0
}

export function escrowFee(budget) {
  return budget > 0 ? bounded(budget, ESCROW_FEE) : 0
}

// Уплаченное за публикацию засчитывается: 7% больше 5%, поэтому переход на
// эскроу после публикации выходит бесплатным.
export function escrowFeeDue(budget, feePaid = 0) {
  return Math.max(0, escrowFee(budget) - feePaid)
}

// Столько спишется с заказчика: бюджет плюс комиссия сверху
export function escrowCharge(budget, feePaid = 0) {
  return budget + escrowFeeDue(budget, feePaid)
}

export const PAYOUT_STATUS_LABELS = {
  NONE: 'Статус не оформлен',
  SELF_EMPLOYED: 'Самозанятый',
  ENTREPRENEUR: 'ИП',
}

export function canReceivePayout(user) {
  return user?.payoutStatus === 'SELF_EMPLOYED' || user?.payoutStatus === 'ENTREPRENEUR'
}

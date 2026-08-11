import crypto from 'node:crypto'

// Мок двухстадийного платежа (authorization → capture/cancel).
// Интерфейс совпадает с будущими адаптерами ЮKassa/Stripe: hold, capture, cancel.
export function createMockPaymentProvider() {
  const payments = new Map()
  return {
    name: 'mock',
    async hold({ amount, currency }) {
      const externalId = `mock_${crypto.randomUUID()}`
      payments.set(externalId, { amount, currency, status: 'held' })
      return { externalId }
    },
    async capture(externalId) {
      const payment = payments.get(externalId)
      if (!payment || payment.status !== 'held') {
        throw new Error(`Платеж ${externalId} нельзя подтвердить (статус: ${payment?.status ?? 'не найден'})`)
      }
      payment.status = 'captured'
    },
    async cancel(externalId) {
      const payment = payments.get(externalId)
      if (!payment || payment.status !== 'held') {
        throw new Error(`Платеж ${externalId} нельзя отменить (статус: ${payment?.status ?? 'не найден'})`)
      }
      payment.status = 'cancelled'
    },
  }
}

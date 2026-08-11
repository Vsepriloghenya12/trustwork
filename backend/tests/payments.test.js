import test from 'node:test'
import assert from 'node:assert/strict'
import { createMockPaymentProvider } from '../src/services/payments/mock.js'

test('hold возвращает externalId', async () => {
  const provider = createMockPaymentProvider()
  const { externalId } = await provider.hold({ amount: 50000, currency: 'RUB' })
  assert.ok(externalId.startsWith('mock_'))
})

test('capture проходит один раз, повторный — ошибка', async () => {
  const provider = createMockPaymentProvider()
  const { externalId } = await provider.hold({ amount: 50000, currency: 'RUB' })
  await provider.capture(externalId)
  await assert.rejects(() => provider.capture(externalId))
})

test('после cancel платеж нельзя подтвердить', async () => {
  const provider = createMockPaymentProvider()
  const { externalId } = await provider.hold({ amount: 50000, currency: 'RUB' })
  await provider.cancel(externalId)
  await assert.rejects(() => provider.capture(externalId))
  await assert.rejects(() => provider.cancel(externalId))
})

test('capture несуществующего платежа — ошибка', async () => {
  const provider = createMockPaymentProvider()
  await assert.rejects(() => provider.capture('mock_nonexistent'))
})

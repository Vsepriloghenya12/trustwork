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

test('забытый после перезапуска платеж не блокирует сделку', async () => {
  const provider = createMockPaymentProvider()
  // Мок хранит платежи в памяти: после рестарта они неизвестны,
  // но приемка и отмена проекта должны оставаться возможными
  await assert.doesNotReject(() => provider.capture('mock_forgotten'))
  await assert.doesNotReject(() => provider.cancel('mock_forgotten'))
})

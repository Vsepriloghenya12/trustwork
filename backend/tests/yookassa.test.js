import test from 'node:test'
import assert from 'node:assert/strict'
import { formatAmountValue, createYooKassaProvider } from '../src/services/payments/yookassa.js'

test('сумма форматируется в формат ЮKassa (рубли с копейками)', () => {
  assert.equal(formatAmountValue(50000), '50000.00')
  assert.equal(formatAmountValue(1), '1.00')
})

test('провайдер не создается без ключей магазина', () => {
  delete process.env.YOOKASSA_SHOP_ID
  delete process.env.YOOKASSA_SECRET_KEY
  assert.throws(() => createYooKassaProvider(), /YOOKASSA_SHOP_ID/)
})

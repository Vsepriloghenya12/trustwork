import { createMockPaymentProvider } from './mock.js'
import { createYooKassaProvider } from './yookassa.js'

// mock — двухстадийный платеж без реальных денег (по умолчанию);
// yookassa — боевой эскроу, включается PAYMENT_PROVIDER=yookassa + ключи магазина
export const paymentProvider =
  process.env.PAYMENT_PROVIDER === 'yookassa'
    ? createYooKassaProvider()
    : createMockPaymentProvider()

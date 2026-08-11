import { createMockPaymentProvider } from './mock.js'

// TODO(production): выбор провайдера по env PAYMENT_PROVIDER (yookassa | stripe)
export const paymentProvider = createMockPaymentProvider()

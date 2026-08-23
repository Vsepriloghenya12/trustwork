import crypto from 'node:crypto'

// Боевой эскроу через ЮKassa: двухстадийный платеж
// create (capture:false) → пользователь подтверждает на странице банка →
// вебхук payment.waiting_for_capture → capture (выплата) или cancel (возврат).
// Включается переменными: PAYMENT_PROVIDER=yookassa, YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY.
// ВАЖНО: перед запуском проверить на малых суммах (дорожная карта, этап «Запуск»).

export function formatAmountValue(amount) {
  return amount.toFixed(2)
}

export function createYooKassaProvider() {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY
  if (!shopId || !secretKey) {
    throw new Error('Для PAYMENT_PROVIDER=yookassa обязательны YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY')
  }
  const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64')

  async function call(path, { method = 'POST', body } = {}) {
    const res = await fetch(`https://api.yookassa.ru/v3/${path}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...(method === 'POST' ? { 'Idempotence-Key': crypto.randomUUID() } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.error('[payments:yookassa]', res.status, JSON.stringify(data))
      throw new Error('Платежный сервис недоступен, попробуйте позже')
    }
    return data
  }

  return {
    name: 'yookassa',
    async hold({ amount, currency, description }) {
      const payment = await call('payments', {
        body: {
          amount: { value: formatAmountValue(amount), currency },
          capture: false,
          confirmation: {
            type: 'redirect',
            return_url:
              process.env.PAYMENT_RETURN_URL || 'https://trustwork-pwa-production.up.railway.app',
          },
          description: description?.slice(0, 128),
        },
      })
      return {
        externalId: payment.id,
        confirmationUrl: payment.confirmation?.confirmation_url ?? null,
      }
    },
    async capture(externalId) {
      await call(`payments/${externalId}/capture`)
    },
    async cancel(externalId) {
      await call(`payments/${externalId}/cancel`)
    },
    // Возврат уже подтвержденного платежа: частичный или полный
    async refund(externalId, amount, currency = 'RUB') {
      await call('refunds', {
        body: {
          payment_id: externalId,
          amount: { value: formatAmountValue(amount), currency },
        },
      })
    },
    // Выплаты исполнителям идут через Т-Банк Мультирасчеты: там проверяется
    // статус самозанятого по базе ФНС и формируется чек за исполнителя.
    // ЮKassa в нашей схеме только принимает деньги.
    async payout() {
      throw new Error('Выплаты через ЮKassa не подключены — используйте Т-Банк Мультирасчеты')
    },
    // Статус перепроверяется у API — телу вебхука не доверяем
    async getStatus(externalId) {
      const payment = await call(`payments/${externalId}`, { method: 'GET' })
      return payment.status
    },
  }
}

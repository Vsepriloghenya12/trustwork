import test from 'node:test'
import assert from 'node:assert/strict'

// Тарифы включаются переменной окружения и читаются при импорте модуля,
// поэтому выставляем ее до динамического импорта.
process.env.BILLING_ENABLED = 'true'
const pricing = await import('../src/services/pricing.js')

const {
  publicationFee,
  escrowFee,
  escrowFeeDue,
  escrowCharge,
  settlement,
  publicationRefundReason,
  canReceivePayout,
  RULES,
} = pricing

test('публикация — 7% от бюджета', () => {
  assert.equal(publicationFee(30000), 2100)
})

test('публикация — не меньше 300 ₽: мелкие заказы не должны быть бесплатными', () => {
  assert.equal(publicationFee(1000), 300)
  assert.equal(publicationFee(100), 300)
})

test('публикация — не больше 10 000 ₽: на крупных заказах комиссия упирается в потолок', () => {
  assert.equal(publicationFee(500000), 10000)
})

test('эскроу — 5% от бюджета, потолка нет', () => {
  assert.equal(escrowFee(30000), 1500)
  assert.equal(escrowFee(500000), 25000)
})

test('эскроу — тоже не меньше 300 ₽', () => {
  assert.equal(escrowFee(1000), 300)
})

test('с заказчика списывается бюджет плюс комиссия сверху', () => {
  assert.equal(escrowCharge(30000), 31500)
})

test('уплаченное за публикацию засчитывается: переход на эскроу выходит бесплатным', () => {
  // 7% (2100) больше 5% (1500), поэтому доплачивать нечего
  assert.equal(escrowFeeDue(30000, 2100), 0)
  assert.equal(escrowCharge(30000, 2100), 30000)
})

test('разница между 7% и 5% при переходе не возвращается', () => {
  const { refund } = settlement(30000, 2100, 30000)
  assert.equal(refund, 0)
})

test('частичная выплата: комиссия берется только с выплаченной части', () => {
  // Бюджет 30 000, заказчик заплатил 31 500. Поддержка присудила исполнителю 10 000.
  const result = settlement(30000, 0, 10000)
  assert.equal(result.payout, 10000)
  assert.equal(result.fee, 500)
  assert.equal(result.refund, 21000)
  // Ничего не потерялось и не возникло из воздуха
  assert.equal(result.payout + result.fee + result.refund, escrowCharge(30000))
})

test('работа не принята вовсе — комиссии нет, заказчику возвращается все', () => {
  const result = settlement(30000, 0, 0)
  assert.equal(result.payout, 0)
  assert.equal(result.fee, 0)
  assert.equal(result.refund, 31500)
})

test('выплата больше бюджета невозможна', () => {
  assert.equal(settlement(30000, 0, 90000).payout, 30000)
})

test('комиссия за публикацию возвращается, если заказчик передумал в первые сутки', () => {
  const project = { feePaid: 2100, publishedAt: new Date('2026-08-24T10:00:00Z') }
  const inHour = new Date('2026-08-24T11:00:00Z')
  assert.equal(publicationRefundReason(project, 3, inHour), 'CANCELLED_EARLY')
})

test('комиссия возвращается, если за неделю не пришло ни одного отклика', () => {
  const project = { feePaid: 2100, publishedAt: new Date('2026-08-01T10:00:00Z') }
  const later = new Date('2026-08-09T10:00:00Z')
  assert.equal(publicationRefundReason(project, 0, later), 'NO_APPLICATIONS')
})

test('отклики были — комиссия остается у платформы', () => {
  const project = { feePaid: 2100, publishedAt: new Date('2026-08-01T10:00:00Z') }
  const later = new Date('2026-08-09T10:00:00Z')
  assert.equal(publicationRefundReason(project, 1, later), null)
})

test('платформа платит только самозанятым и ИП', () => {
  assert.equal(canReceivePayout({ payoutStatus: 'SELF_EMPLOYED' }), true)
  assert.equal(canReceivePayout({ payoutStatus: 'ENTREPRENEUR' }), true)
  assert.equal(canReceivePayout({ payoutStatus: 'NONE' }), false)
  assert.equal(canReceivePayout(null), false)
})

test('сроки совпадают с договоренностями', () => {
  // 30 дней — предел хранения денег на счете банка, не наша прихоть
  assert.equal(RULES.payoutStatusDays, 30)
  assert.equal(RULES.disputeChatDays, 3)
  assert.equal(RULES.silentFreelancerDays, 14)
  assert.equal(RULES.publicationRefundDays, 7)
  assert.equal(RULES.publicationCancelHours, 24)
})

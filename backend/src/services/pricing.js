// Единственная точка правды по деньгам платформы.
// Модель зафиксирована с владельцем — см. PROJECT_SPEC.md, раздел «Монетизация».

// Публикация без эскроу. Заказчик платит вперед, поэтому увести сделку мимо
// платформы ему уже нечего: комиссия уплачена до первого отклика.
export const PUBLICATION_FEE = { rate: 0.07, min: 300, cap: 10000 }

// С эскроу дешевле — 5%. Начисляются сверх бюджета: исполнитель получает
// всю сумму работы целиком, без вычетов.
export const ESCROW_FEE = { rate: 0.05, min: 300, cap: null }

export const RULES = {
  // Комиссия за публикацию возвращается, если за неделю не пришло ни одного отклика
  publicationRefundDays: 7,
  // ...или если заказчик передумал в первые сутки
  publicationCancelHours: 24,
  // Сколько ждем оформления самозанятости. Дольше нельзя технически:
  // на счете банка деньги хранятся не больше 30 дней.
  payoutStatusDays: 30,
  // Спор сначала три дня живет между сторонами, потом уходит в поддержку
  disputeChatDays: 3,
  // Исполнитель молчит две недели — заказчик закрывает проект сам
  silentFreelancerDays: 14,
}

// Бесплатный период. Пока не подключен банк, комиссия не взимается, но тарифы
// в интерфейсе уже показываются — чтобы включение платы не стало сюрпризом.
export const billingEnabled = process.env.BILLING_ENABLED === 'true'

function bounded(amount, { rate, min, cap }) {
  const raw = Math.round(amount * rate)
  const withMin = Math.max(raw, min)
  return cap ? Math.min(withMin, cap) : withMin
}

// «Regular» — тариф как он есть, независимо от бесплатного периода.
// Нужен интерфейсу, чтобы показывать будущую цену.
export function regularPublicationFee(budget) {
  return bounded(budget, PUBLICATION_FEE)
}

export function regularEscrowFee(budget) {
  return bounded(budget, ESCROW_FEE)
}

export function publicationFee(budget) {
  return billingEnabled ? regularPublicationFee(budget) : 0
}

export function escrowFee(budget) {
  return billingEnabled ? regularEscrowFee(budget) : 0
}

// Заказчик уже платил за публикацию — засчитываем. Поскольку 7% всегда больше 5%,
// переход на эскроу после публикации выходит бесплатным, а разница не возвращается:
// выбрать эскроу сразу дешевле, чем передумать потом.
export function escrowFeeDue(budget, feePaid = 0) {
  return Math.max(0, escrowFee(budget) - feePaid)
}

// Сколько списать с заказчика при заморозке бюджета
export function escrowCharge(budget, feePaid = 0) {
  return budget + escrowFeeDue(budget, feePaid)
}

// Итог сделки, когда исполнителю уходит не весь бюджет (частичная выплата по спору).
// Комиссия берется только с фактически выплаченной части, остальное возвращается заказчику.
// Уплаченное за публикацию назад не идет: до этого места проект дошел, работа его нашла.
export function settlement(budget, feePaid, paidOut) {
  const payout = Math.max(0, Math.min(paidOut, budget))
  const charged = escrowCharge(budget, feePaid)
  const fee = payout === 0 ? 0 : Math.min(escrowFee(budget), bounded(payout, ESCROW_FEE))
  const keptByPlatform = Math.max(0, fee - feePaid)
  return { payout, fee, refund: Math.max(0, charged - payout - keptByPlatform) }
}

// Возврат комиссии за публикацию: неделя без единого отклика или отказ в первые сутки
export function publicationRefundReason(project, applicationsCount, now = new Date()) {
  if (project.feePaid <= 0 || !project.publishedAt) return null
  const hours = (now - project.publishedAt) / 3600000
  if (hours <= RULES.publicationCancelHours) return 'CANCELLED_EARLY'
  if (applicationsCount === 0 && hours >= RULES.publicationRefundDays * 24) return 'NO_APPLICATIONS'
  return null
}

export function daysFromNow(days, now = new Date()) {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return date
}

// Платформа платит только самозанятым и ИП: выплата обычному физлицу сделала бы
// ее налоговым агентом и потребовала бы страховых взносов сверх суммы сделки.
export function canReceivePayout(user) {
  return user?.payoutStatus === 'SELF_EMPLOYED' || user?.payoutStatus === 'ENTREPRENEUR'
}

import test from 'node:test'
import assert from 'node:assert/strict'

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/trustwork'
const { countMatches, rankCandidates, subscriptionMatches, subscriptionTitle } = await import(
  '../src/services/matching.js'
)

test('совпадением считается общий навык, регистр не важен', () => {
  assert.equal(countMatches(['Дизайн', 'логотипы'], ['дизайн', 'верстка']), 1)
  assert.equal(countMatches(['дизайн', 'логотипы'], ['дизайн', 'логотипы']), 2)
  assert.equal(countMatches([], ['дизайн']), 0)
})

test('порядок: больше совпадений выше, при равенстве — новые профили', () => {
  const users = [
    { id: 'old', skills: ['дизайн'], createdAt: new Date('2026-01-01') },
    { id: 'new', skills: ['дизайн'], createdAt: new Date('2026-08-01') },
    { id: 'best', skills: ['дизайн', 'логотипы'], createdAt: new Date('2025-01-01') },
    { id: 'none', skills: ['тексты'], createdAt: new Date('2026-08-20') },
  ]
  const ranked = rankCandidates(users, ['дизайн', 'логотипы']).map((c) => c.user.id)
  assert.deepEqual(ranked, ['best', 'new', 'old'])
})

const project = {
  id: 'p1',
  clientId: 'client',
  title: 'Логотип для кофейни',
  description: 'Нужен фирменный стиль',
  budget: 50000,
  tags: ['дизайн', 'логотипы'],
}

test('подписка без условий ловит любой проект', () => {
  assert.ok(subscriptionMatches({ userId: 'u1', muted: false }, project, { escrowActive: false }))
})

test('условия подписки отсекают неподходящее', () => {
  const base = { userId: 'u1', muted: false }
  assert.ok(!subscriptionMatches({ ...base, tag: 'тексты' }, project, { escrowActive: true }))
  assert.ok(!subscriptionMatches({ ...base, minBudget: 80000 }, project, { escrowActive: true }))
  assert.ok(!subscriptionMatches({ ...base, escrowOnly: true }, project, { escrowActive: false }))
  assert.ok(subscriptionMatches({ ...base, escrowOnly: true }, project, { escrowActive: true }))
})

test('поиск в подписке учитывает склонения', () => {
  const base = { userId: 'u1', muted: false }
  assert.ok(subscriptionMatches({ ...base, search: 'логотипы' }, project, { escrowActive: false }))
  assert.ok(!subscriptionMatches({ ...base, search: 'видео' }, project, { escrowActive: false }))
})

test('приглушенная подписка и свой проект не уведомляют', () => {
  assert.ok(!subscriptionMatches({ userId: 'u1', muted: true }, project, { escrowActive: true }))
  assert.ok(!subscriptionMatches({ userId: 'client', muted: false }, project, { escrowActive: true }))
})

test('название подписки собирается из условий', () => {
  // В русском формате чисел разделитель — неразрывный пробел, приводим к обычному
  const title = subscriptionTitle({ tag: 'дизайн', minBudget: 30000, escrowOnly: true }).replace(
    / /g,
    ' ',
  )
  assert.equal(title, 'дизайн · от 30 000 ₽ · с эскроу')
  assert.equal(subscriptionTitle({}), 'Все проекты')
})

import test from 'node:test'
import assert from 'node:assert/strict'

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/trustwork'
const { resolveReviewTarget, REVIEW_TAGS } = await import('../src/services/reviews.js')

test('исполнитель завершенной сделки оценивает заказчика звездами (DEAL)', () => {
  const project = { status: 'COMPLETED', clientId: 'c1', freelancerId: 'f1' }
  const t = resolveReviewTarget(project, 'f1')
  assert.equal(t.subjectId, 'c1')
  assert.equal(t.kind, 'DEAL')
  assert.ok(t.requiresDialog)
  assert.ok(t.allowed)
})

test('до завершения сделки фрилансер оставляет только факт-теги (DIALOG)', () => {
  assert.equal(resolveReviewTarget({ status: 'OPEN', clientId: 'c1', freelancerId: null }, 'f1').kind, 'DIALOG')
  assert.equal(resolveReviewTarget({ status: 'IN_PROGRESS', clientId: 'c1', freelancerId: 'f1' }, 'f1').kind, 'DIALOG')
})

test('не-исполнитель даже по завершенному проекту — только DIALOG', () => {
  const project = { status: 'COMPLETED', clientId: 'c1', freelancerId: 'f1' }
  assert.equal(resolveReviewTarget(project, 'f2').kind, 'DIALOG')
})

test('заказчик оценивает исполнителя после завершения: звезды, без тегов и диалог-гейта', () => {
  const project = { status: 'COMPLETED', clientId: 'c1', freelancerId: 'f1' }
  const t = resolveReviewTarget(project, 'c1')
  assert.equal(t.subjectId, 'f1')
  assert.equal(t.kind, 'DEAL')
  assert.ok(!t.requiresDialog)
  assert.ok(!t.allowTags)
  assert.ok(t.allowed)
})

test('заказчик не может оценить исполнителя до завершения сделки', () => {
  assert.ok(!resolveReviewTarget({ status: 'IN_PROGRESS', clientId: 'c1', freelancerId: 'f1' }, 'c1').allowed)
  assert.ok(!resolveReviewTarget({ status: 'OPEN', clientId: 'c1', freelancerId: null }, 'c1').allowed)
})

test('в списке факт-тегов есть и негативные, и позитивные', () => {
  assert.ok(REVIEW_TAGS.includes('просит бесплатное тестовое'))
  assert.ok(REVIEW_TAGS.includes('конкретное ТЗ'))
})

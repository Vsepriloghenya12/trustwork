import test from 'node:test'
import assert from 'node:assert/strict'

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/trustwork'
const { determineReviewKind, REVIEW_TAGS } = await import('../src/services/reviews.js')

test('исполнитель завершенной сделки оставляет DEAL-отзыв со звездами', () => {
  const project = { status: 'COMPLETED', freelancerId: 'f1' }
  assert.equal(determineReviewKind(project, 'f1'), 'DEAL')
})

test('до завершения сделки — только DIALOG (факт-теги)', () => {
  assert.equal(determineReviewKind({ status: 'OPEN', freelancerId: null }, 'f1'), 'DIALOG')
  assert.equal(determineReviewKind({ status: 'IN_PROGRESS', freelancerId: 'f1' }, 'f1'), 'DIALOG')
})

test('не-исполнитель даже по завершенному проекту оставляет только DIALOG', () => {
  const project = { status: 'COMPLETED', freelancerId: 'f1' }
  assert.equal(determineReviewKind(project, 'f2'), 'DIALOG')
})

test('в списке факт-тегов есть и негативные, и позитивные', () => {
  assert.ok(REVIEW_TAGS.includes('просит бесплатное тестовое'))
  assert.ok(REVIEW_TAGS.includes('конкретное ТЗ'))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFeedOrder, FEED_SORTS } from '../src/services/feedSort.js'

test('по умолчанию проекты с эскроу выше', () => {
  assert.deepEqual(buildFeedOrder('escrow'), [{ status: 'asc' }, { createdAt: 'desc' }])
  assert.deepEqual(buildFeedOrder(undefined), [{ status: 'asc' }, { createdAt: 'desc' }])
})

test('сортировка по рейтингу заказчика', () => {
  assert.deepEqual(buildFeedOrder('rating'), [
    { client: { rating: 'desc' } },
    { createdAt: 'desc' },
  ])
})

test('сначала дорогие', () => {
  assert.deepEqual(buildFeedOrder('budget'), [{ budget: 'desc' }, { createdAt: 'desc' }])
})

test('новые — только по дате', () => {
  assert.deepEqual(buildFeedOrder('new'), [{ createdAt: 'desc' }])
})

test('во всех вариантах порядок детерминирован (есть тай-брейк по дате)', () => {
  for (const sort of FEED_SORTS) {
    const order = buildFeedOrder(sort)
    assert.ok(order.some((o) => 'createdAt' in o), `нет тай-брейка для ${sort}`)
  }
})

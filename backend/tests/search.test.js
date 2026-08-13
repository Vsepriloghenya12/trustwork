import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSearchTerms, buildSearchFilter } from '../src/services/search.js'

test('длинные слова ищутся по основе — склонения находятся', () => {
  assert.deepEqual(buildSearchTerms('йога'), ['йог'])
  assert.deepEqual(buildSearchTerms('тексты'), ['текст'])
  assert.deepEqual(buildSearchTerms('лендинг'), ['лендин'])
})

test('короткие слова не режутся', () => {
  assert.deepEqual(buildSearchTerms('SMM'), ['SMM'])
  assert.deepEqual(buildSearchTerms('веб'), ['веб'])
})

test('каждое слово запроса обязательно (AND)', () => {
  const filter = buildSearchFilter('логотип кофейня')
  assert.equal(filter.AND.length, 2)
  assert.ok(filter.AND[0].OR.some((c) => c.title))
  assert.ok(filter.AND[0].OR.some((c) => c.description))
})

test('пустой запрос не создает фильтр', () => {
  assert.equal(buildSearchFilter('   '), undefined)
  assert.equal(buildSearchFilter(''), undefined)
})

test('число слов ограничено', () => {
  assert.equal(buildSearchTerms('один два три четыре пять шесть').length, 4)
})

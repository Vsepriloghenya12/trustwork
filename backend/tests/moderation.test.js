import test from 'node:test'
import assert from 'node:assert/strict'
import { maskContacts } from '../src/services/moderation.js'

test('скрывает телефон с разделителями', () => {
  const { text, wasMasked } = maskContacts('Позвони мне +7 900 123-45-67 вечером')
  assert.ok(wasMasked)
  assert.ok(!text.includes('123'))
  assert.ok(text.includes('[скрыто]'))
})

test('скрывает телефон без разделителей', () => {
  const { text } = maskContacts('мой номер 89001234567')
  assert.ok(!text.includes('89001234567'))
})

test('скрывает @никнейм', () => {
  const { text } = maskContacts('Пиши в телегу @designer_pro')
  assert.ok(!text.includes('@designer_pro'))
})

test('скрывает email', () => {
  const { text } = maskContacts('Отправь на work.mail+1@example.com пожалуйста')
  assert.ok(!text.includes('example.com'))
})

test('скрывает ссылку t.me', () => {
  const { text } = maskContacts('вот ссылка https://t.me/username')
  assert.ok(!text.includes('t.me/username'))
})

test('не трогает обычный текст с ценами и сроками', () => {
  const source = 'Бюджет 50000 руб, срок 10 дней, макет в Figma'
  const { text, wasMasked } = maskContacts(source)
  assert.equal(text, source)
  assert.ok(!wasMasked)
})

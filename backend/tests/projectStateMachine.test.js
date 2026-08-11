import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PROJECT_TRANSITIONS,
  canTransition,
  assertTransition,
} from '../src/services/projectStateMachine.js'

test('заморозка бюджета возможна из DRAFT и PENDING_PAYMENT', () => {
  assert.ok(canTransition('DRAFT', 'FUNDED'))
  assert.ok(canTransition('PENDING_PAYMENT', 'FUNDED'))
})

test('в работу проект уходит только из FUNDED', () => {
  assert.ok(canTransition('FUNDED', 'IN_PROGRESS'))
  assert.ok(!canTransition('DRAFT', 'IN_PROGRESS'))
  assert.ok(!canTransition('PENDING_PAYMENT', 'IN_PROGRESS'))
})

test('завершить можно только проект в работе', () => {
  assert.ok(canTransition('IN_PROGRESS', 'COMPLETED'))
  assert.ok(!canTransition('FUNDED', 'COMPLETED'))
  assert.ok(!canTransition('DRAFT', 'COMPLETED'))
})

test('COMPLETED и CANCELLED — терминальные статусы', () => {
  assert.equal(PROJECT_TRANSITIONS.COMPLETED.length, 0)
  assert.equal(PROJECT_TRANSITIONS.CANCELLED.length, 0)
  assert.ok(!canTransition('COMPLETED', 'CANCELLED'))
  assert.ok(!canTransition('CANCELLED', 'FUNDED'))
})

test('assertTransition бросает 409 на недопустимый переход', () => {
  assert.throws(() => assertTransition('COMPLETED', 'IN_PROGRESS'), (err) => err.status === 409)
  assert.doesNotThrow(() => assertTransition('FUNDED', 'IN_PROGRESS'))
})

test('неизвестный статус не дает переходов', () => {
  assert.ok(!canTransition('UNKNOWN', 'FUNDED'))
})

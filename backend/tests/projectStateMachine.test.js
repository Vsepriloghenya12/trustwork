import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PROJECT_TRANSITIONS,
  canTransition,
  assertTransition,
} from '../src/services/projectStateMachine.js'

test('публикация: бесплатно (OPEN) или сразу с эскроу (FUNDED)', () => {
  assert.ok(canTransition('DRAFT', 'OPEN'))
  assert.ok(canTransition('DRAFT', 'FUNDED'))
})

test('эскроу можно подключить к уже открытому проекту', () => {
  assert.ok(canTransition('OPEN', 'FUNDED'))
  assert.ok(!canTransition('IN_PROGRESS', 'FUNDED'))
})

test('redirect-оплата: открытый проект уходит в ожидание платежа и обратно в FUNDED', () => {
  assert.ok(canTransition('OPEN', 'PENDING_PAYMENT'))
  assert.ok(canTransition('PENDING_PAYMENT', 'FUNDED'))
})

test('в работу проект уходит из OPEN и FUNDED, но не из черновика', () => {
  assert.ok(canTransition('OPEN', 'IN_PROGRESS'))
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

test('после приемки деньги могут ждать статуса исполнителя', () => {
  assert.ok(canTransition('IN_PROGRESS', 'AWAITING_PAYOUT'))
  assert.ok(canTransition('AWAITING_PAYOUT', 'COMPLETED'))
  // Возврат заказчику, когда статус так и не появился, — рычаг поддержки
  assert.ok(canTransition('AWAITING_PAYOUT', 'CANCELLED'))
})

test('спор возможен и в работе, и когда деньги ждут выплаты', () => {
  assert.ok(canTransition('IN_PROGRESS', 'DISPUTED'))
  assert.ok(canTransition('AWAITING_PAYOUT', 'DISPUTED'))
  // Решение поддержки: выплатить или вернуть
  assert.ok(canTransition('DISPUTED', 'COMPLETED'))
  assert.ok(canTransition('DISPUTED', 'CANCELLED'))
})

test('спор нельзя открыть до начала работы и после закрытия сделки', () => {
  assert.ok(!canTransition('OPEN', 'DISPUTED'))
  assert.ok(!canTransition('FUNDED', 'DISPUTED'))
  assert.ok(!canTransition('COMPLETED', 'DISPUTED'))
})

test('платная публикация проходит через ожидание оплаты', () => {
  assert.ok(canTransition('DRAFT', 'PENDING_PAYMENT'))
  assert.ok(canTransition('PENDING_PAYMENT', 'OPEN'))
  assert.ok(canTransition('PENDING_PAYMENT', 'FUNDED'))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { adminPhones, isAdminPhone } from '../src/services/admins.js'

test('без ADMIN_PHONES владельцев нет', () => {
  delete process.env.ADMIN_PHONES
  assert.deepEqual(adminPhones(), [])
  assert.equal(isAdminPhone('+79990000001'), false)
})

test('список телефонов разбирается с пробелами', () => {
  process.env.ADMIN_PHONES = '+79990000001, +79990000002'
  assert.deepEqual(adminPhones(), ['+79990000001', '+79990000002'])
  assert.ok(isAdminPhone('+79990000002'))
})

test('чужой номер владельцем не считается', () => {
  process.env.ADMIN_PHONES = '+79990000001'
  assert.equal(isAdminPhone('+79995550000'), false)
  delete process.env.ADMIN_PHONES
})

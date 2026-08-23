import test from 'node:test'
import assert from 'node:assert/strict'
import { invitationExpiry, isExpired, visibleStatus } from '../src/services/invitations.js'

const now = new Date('2026-08-23T12:00:00Z')

test('приглашение живет 14 дней', () => {
  const expiry = invitationExpiry({ deadline: null }, now)
  assert.equal(expiry.toISOString().slice(0, 10), '2026-09-06')
})

test('но не дольше срока задачи', () => {
  const deadline = new Date('2026-08-28T00:00:00Z')
  assert.equal(invitationExpiry({ deadline }, now).getTime(), deadline.getTime())
})

test('дальний срок задачи не продлевает приглашение', () => {
  const deadline = new Date('2026-12-01T00:00:00Z')
  assert.equal(invitationExpiry({ deadline }, now).toISOString().slice(0, 10), '2026-09-06')
})

test('просроченное приглашение показывается истекшим', () => {
  const stale = { status: 'SENT', expiresAt: new Date('2026-08-01') }
  assert.ok(isExpired(stale, now))
  assert.equal(visibleStatus(stale, now), 'EXPIRED')
})

test('отвеченное приглашение не истекает задним числом', () => {
  const accepted = { status: 'ACCEPTED', expiresAt: new Date('2026-08-01') }
  assert.ok(!isExpired(accepted, now))
  assert.equal(visibleStatus(accepted, now), 'ACCEPTED')
})

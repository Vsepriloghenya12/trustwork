import test from 'node:test'
import assert from 'node:assert/strict'
import { canDownloadFile, sanitizeFileName, ALLOWED_MIME } from '../src/services/files.js'

const project = { clientId: 'c1', freelancerId: 'f1' }

test('публичный файл открывается всеми, включая гостя', () => {
  const file = { visibility: 'PUBLIC' }
  assert.ok(canDownloadFile(file, project, undefined, false))
  assert.ok(canDownloadFile(file, project, 'stranger', false))
})

test('закрытый файл не открывается гостем и посторонним', () => {
  const file = { visibility: 'APPLICANTS' }
  assert.ok(!canDownloadFile(file, project, undefined, false))
  assert.ok(!canDownloadFile(file, project, 'stranger', false))
})

test('закрытый файл открывается откликнувшимся, заказчиком и исполнителем', () => {
  const file = { visibility: 'APPLICANTS' }
  assert.ok(canDownloadFile(file, project, 'applicant', true))
  assert.ok(canDownloadFile(file, project, 'c1', false))
  assert.ok(canDownloadFile(file, project, 'f1', false))
})

test('имя файла очищается от кавычек и переносов строк', () => {
  assert.equal(sanitizeFileName('тз"\r\nверсия.pdf'), 'тз___версия.pdf')
  assert.equal(sanitizeFileName(''), 'file')
  assert.ok(sanitizeFileName('a'.repeat(300)).length <= 120)
})

test('в белом списке есть PDF и картинки, нет исполняемых типов', () => {
  assert.ok(ALLOWED_MIME.includes('application/pdf'))
  assert.ok(ALLOWED_MIME.includes('image/png'))
  assert.ok(!ALLOWED_MIME.some((m) => m.includes('javascript') || m.includes('html')))
})

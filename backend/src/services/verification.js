import crypto from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../utils/errors.js'

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

export function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

export async function createVerificationCode(phone) {
  const code = generateCode()
  await prisma.verificationCode.create({
    data: { phone, code, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  })
  return code
}

export async function consumeVerificationCode(phone, code) {
  const record = await prisma.verificationCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) throw new ApiError(400, 'Код не найден или истек, запросите новый')
  if (record.attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, 'Слишком много попыток, запросите новый код')
  }
  if (record.code !== code) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    throw new ApiError(400, 'Неверный код')
  }
  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  })
}

import crypto from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../utils/errors.js'

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_CODES_PER_HOUR = 5

export function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

// Троттлинг: SMS стоят денег — не даем спамить запросами кода
export async function createVerificationCode(phone) {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recent = await prisma.verificationCode.findMany({
    where: { phone, createdAt: { gt: hourAgo } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new ApiError(429, 'Код уже отправлен. Повторить можно через минуту')
  }
  if (recent.length >= MAX_CODES_PER_HOUR) {
    throw new ApiError(429, 'Слишком много запросов кода. Попробуйте через час')
  }
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

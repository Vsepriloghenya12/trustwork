import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../config.js'
import { prisma } from '../lib/prisma.js'
import { sendSms } from '../services/sms.js'
import { createVerificationCode, consumeVerificationCode } from '../services/verification.js'
import { isAdminPhone } from '../services/admins.js'
import { privateUser } from '../utils/serializers.js'

const phoneSchema = z
  .string()
  .regex(/^\+?\d{10,15}$/, 'Телефон в формате +79001234567')

// 89001234567 и +79001234567 — один и тот же аккаунт
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('8') ? `+7${digits.slice(1)}` : `+${digits}`
}

export const authRouter = Router()

authRouter.post('/request-code', async (req, res) => {
  const { phone } = z.object({ phone: phoneSchema }).parse(req.body)
  const normalized = normalizePhone(phone)
  const code = await createVerificationCode(normalized)
  await sendSms(normalized, `TrustWork: код подтверждения ${code}`)
  res.json({ ok: true, ...(config.isProd ? {} : { devCode: code }) })
})

authRouter.post('/verify', async (req, res) => {
  const body = z
    .object({
      phone: phoneSchema,
      code: z.string().length(6),
      role: z.enum(['CLIENT', 'FREELANCER']).optional(),
    })
    .parse(req.body)
  const phone = normalizePhone(body.phone)
  await consumeVerificationCode(phone, body.code)
  const existing = await prisma.user.findUnique({ where: { phone } })
  let user =
    existing ?? (await prisma.user.create({ data: { phone, role: body.role ?? 'FREELANCER' } }))
  // Доступ владельца выдается по номеру из ADMIN_PHONES
  const shouldBeAdmin = isAdminPhone(phone)
  if (user.isAdmin !== shouldBeAdmin) {
    user = await prisma.user.update({ where: { id: user.id }, data: { isAdmin: shouldBeAdmin } })
  }
  const token = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: '30d' })
  res.json({ token, user: privateUser(user), isNew: !existing })
})

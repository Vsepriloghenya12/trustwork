import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../utils/errors.js'

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) throw new ApiError(401, 'Требуется авторизация')
  let payload
  try {
    payload = jwt.verify(header.slice(7), config.jwtSecret)
  } catch {
    throw new ApiError(401, 'Недействительный токен')
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user) throw new ApiError(401, 'Пользователь не найден')
  req.user = user
  next()
}

export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return next()
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret)
    req.user = (await prisma.user.findUnique({ where: { id: payload.sub } })) ?? undefined
  } catch {
    // гостевой доступ
  }
  next()
}

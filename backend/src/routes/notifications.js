import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { vapidPublicKey } from '../services/push.js'

export const notificationsRouter = Router()

// Ключ нужен браузеру, чтобы оформить push-подписку
notificationsRouter.get('/vapid', (req, res) => {
  res.json({ key: vapidPublicKey() })
})

notificationsRouter.get('/', requireAuth, async (req, res) => {
  const { take, skip } = z
    .object({
      take: z.coerce.number().int().min(1).max(100).default(50),
      skip: z.coerce.number().int().min(0).default(0),
    })
    .parse(req.query)
  const items = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  })
  res.json(items)
})

notificationsRouter.get('/unread', requireAuth, async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user.id, readAt: null },
  })
  res.json({ count })
})

notificationsRouter.post('/read', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  })
  res.json({ ok: true })
})

// Общий выключатель push
notificationsRouter.patch('/settings', requireAuth, async (req, res) => {
  const { pushEnabled } = z.object({ pushEnabled: z.boolean() }).parse(req.body)
  await prisma.user.update({ where: { id: req.user.id }, data: { pushEnabled } })
  res.json({ pushEnabled })
})

// Устройство подписалось на push
notificationsRouter.post('/devices', requireAuth, async (req, res) => {
  const { endpoint, keys } = z
    .object({
      endpoint: z.string().url(),
      keys: z.object({ p256dh: z.string(), auth: z.string() }),
    })
    .parse(req.body)
  const device = await prisma.pushDevice.upsert({
    where: { endpoint },
    update: { userId: req.user.id, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  })
  res.status(201).json({ id: device.id })
})

notificationsRouter.delete('/devices', requireAuth, async (req, res) => {
  const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body)
  await prisma.pushDevice.deleteMany({ where: { endpoint, userId: req.user.id } })
  res.json({ ok: true })
})

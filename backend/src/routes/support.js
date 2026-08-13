import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { ApiError } from '../utils/errors.js'

export const supportRouter = Router()

// --- Сторона пользователя: одна ветка диалога с поддержкой ---

supportRouter.get('/messages', requireAuth, async (req, res) => {
  const messages = await prisma.supportMessage.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'asc' },
  })
  // Открытие диалога отмечает ответы поддержки прочитанными
  await prisma.supportMessage.updateMany({
    where: { userId: req.user.id, fromSupport: true, readAt: null },
    data: { readAt: new Date() },
  })
  res.json(messages)
})

supportRouter.post('/messages', requireAuth, async (req, res) => {
  const { text } = z.object({ text: z.string().min(1).max(5000) }).parse(req.body)
  const message = await prisma.supportMessage.create({
    data: { userId: req.user.id, text: text.trim(), fromSupport: false },
  })
  res.status(201).json(message)
})

supportRouter.get('/unread', requireAuth, async (req, res) => {
  const count = await prisma.supportMessage.count({
    where: { userId: req.user.id, fromSupport: true, readAt: null },
  })
  res.json({ count })
})

// --- Сторона владельца ---

// Список диалогов: кто писал, последнее сообщение, сколько без ответа
supportRouter.get('/threads', requireAuth, requireAdmin, async (req, res) => {
  const grouped = await prisma.supportMessage.groupBy({
    by: ['userId'],
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: 'desc' } },
    take: 100,
  })
  const userIds = grouped.map((g) => g.userId)
  const [users, lastMessages, unanswered] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } } }),
    prisma.supportMessage.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supportMessage.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, fromSupport: false, readAt: null },
      _count: true,
    }),
  ])
  const userById = Object.fromEntries(users.map((u) => [u.id, u]))
  const unansweredBy = Object.fromEntries(unanswered.map((u) => [u.userId, u._count]))
  res.json(
    grouped.map((g) => {
      const user = userById[g.userId]
      const last = lastMessages.find((m) => m.userId === g.userId)
      return {
        userId: g.userId,
        user: user
          ? { id: user.id, name: user.name, phone: user.phone, role: user.role }
          : null,
        lastMessage: last ? { text: last.text, fromSupport: last.fromSupport, createdAt: last.createdAt } : null,
        unanswered: unansweredBy[g.userId] ?? 0,
      }
    }),
  )
})

supportRouter.get('/threads/:userId', requireAuth, requireAdmin, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.userId } })
  if (!user) throw new ApiError(404, 'Пользователь не найден')
  const messages = await prisma.supportMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  })
  // Открытие ветки отмечает обращения пользователя прочитанными
  await prisma.supportMessage.updateMany({
    where: { userId: user.id, fromSupport: false, readAt: null },
    data: { readAt: new Date() },
  })
  res.json({
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    messages,
  })
})

supportRouter.post('/threads/:userId', requireAuth, requireAdmin, async (req, res) => {
  const { text } = z.object({ text: z.string().min(1).max(5000) }).parse(req.body)
  const user = await prisma.user.findUnique({ where: { id: req.params.userId } })
  if (!user) throw new ApiError(404, 'Пользователь не найден')
  const message = await prisma.supportMessage.create({
    data: { userId: user.id, text: text.trim(), fromSupport: true },
  })
  res.status(201).json(message)
})

// Счетчик необработанных обращений для страницы владельца
supportRouter.get('/pending', requireAuth, requireAdmin, async (req, res) => {
  const count = await prisma.supportMessage.count({
    where: { fromSupport: false, readAt: null },
  })
  res.json({ count })
})

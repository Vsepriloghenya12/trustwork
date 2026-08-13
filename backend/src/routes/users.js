import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { ApiError } from '../utils/errors.js'
import { publicUser, privateUser } from '../utils/serializers.js'

export const usersRouter = Router()

// У заказчика вместо «сделок с эскроу» показываем, сколько проектов он разместил
async function withRoleStats(user, serialize) {
  const base = serialize(user)
  if (user.role !== 'CLIENT') return base
  const postedProjects = await prisma.project.count({
    where: { clientId: user.id, status: { not: 'DRAFT' } },
  })
  return { ...base, postedProjects }
}

usersRouter.get('/me', requireAuth, async (req, res) => {
  res.json(await withRoleStats(req.user, privateUser))
})

usersRouter.patch('/me', requireAuth, async (req, res) => {
  const data = z
    .object({
      name: z.string().min(1).max(100).optional(),
      role: z.enum(['CLIENT', 'FREELANCER']).optional(),
      bio: z.string().max(2000).optional(),
      skills: z.array(z.string().min(1).max(40)).max(20).optional(),
      telegram: z.string().max(100).optional(),
      github: z.string().max(100).optional(),
    })
    .parse(req.body)
  const user = await prisma.user.update({ where: { id: req.user.id }, data })
  res.json(await withRoleStats(user, privateUser))
})

// Непрочитанные сообщения: всего и по проектам (для бейджей в навигации и списке чатов)
usersRouter.get('/me/unread', requireAuth, async (req, res) => {
  const grouped = await prisma.message.groupBy({
    by: ['projectId'],
    where: { recipientId: req.user.id, readAt: null },
    _count: true,
  })
  res.json({
    total: grouped.reduce((sum, g) => sum + g._count, 0),
    byProject: Object.fromEntries(grouped.map((g) => [g.projectId, g._count])),
  })
})

usersRouter.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) throw new ApiError(404, 'Пользователь не найден')
  res.json(await withRoleStats(user, publicUser))
})

// Отзывы о пользователе: сводка по видам + последние отзывы
usersRouter.get('/:id/reviews', async (req, res) => {
  const all = await prisma.review.findMany({
    where: { subjectId: req.params.id },
    select: { kind: true },
  })
  const recent = await prisma.review.findMany({
    where: { subjectId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { author: true },
  })
  res.json({
    summary: {
      dealCount: all.filter((r) => r.kind === 'DEAL').length,
      dialogCount: all.filter((r) => r.kind === 'DIALOG').length,
    },
    reviews: recent.map((r) => ({
      id: r.id,
      kind: r.kind,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      author: { id: r.author.id, name: r.author.name },
    })),
  })
})

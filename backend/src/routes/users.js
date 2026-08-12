import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { ApiError } from '../utils/errors.js'
import { publicUser, privateUser } from '../utils/serializers.js'

export const usersRouter = Router()

usersRouter.get('/me', requireAuth, (req, res) => {
  res.json(privateUser(req.user))
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
  res.json(privateUser(user))
})

usersRouter.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) throw new ApiError(404, 'Пользователь не найден')
  res.json(publicUser(user))
})

// Отзывы о пользователе: сводка по факт-тегам + последние отзывы
usersRouter.get('/:id/reviews', async (req, res) => {
  const all = await prisma.review.findMany({
    where: { subjectId: req.params.id },
    select: { kind: true, tags: true },
  })
  const tagCounts = {}
  for (const r of all) {
    for (const tag of r.tags) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
  }
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
      tagCounts,
    },
    reviews: recent.map((r) => ({
      id: r.id,
      kind: r.kind,
      rating: r.rating,
      tags: r.tags,
      comment: r.comment,
      createdAt: r.createdAt,
      author: { id: r.author.id, name: r.author.name },
    })),
  })
})

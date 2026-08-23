import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { subscriptionTitle } from '../services/matching.js'
import { ApiError } from '../utils/errors.js'

const MAX_SUBSCRIPTIONS = 10

export const subscriptionsRouter = Router()

subscriptionsRouter.get('/', requireAuth, async (req, res) => {
  const list = await prisma.subscription.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })
  res.json(list)
})

subscriptionsRouter.post('/', requireAuth, async (req, res) => {
  const body = z
    .object({
      tag: z.string().max(40).optional(),
      search: z.string().max(120).optional(),
      minBudget: z.number().int().positive().optional(),
      escrowOnly: z.boolean().default(false),
      title: z.string().min(1).max(80).optional(),
    })
    .parse(req.body)

  const count = await prisma.subscription.count({ where: { userId: req.user.id } })
  if (count >= MAX_SUBSCRIPTIONS) {
    throw new ApiError(409, `Больше ${MAX_SUBSCRIPTIONS} подписок завести нельзя`)
  }

  const data = {
    userId: req.user.id,
    tag: body.tag?.trim() || null,
    search: body.search?.trim() || null,
    minBudget: body.minBudget ?? null,
    escrowOnly: body.escrowOnly,
  }
  // Одинаковые условия дважды сохранять незачем
  const same = await prisma.subscription.findFirst({
    where: {
      userId: req.user.id,
      tag: data.tag,
      search: data.search,
      minBudget: data.minBudget,
      escrowOnly: data.escrowOnly,
    },
  })
  if (same) throw new ApiError(409, 'Такая подписка уже есть')

  const subscription = await prisma.subscription.create({
    data: { ...data, title: body.title?.trim() || subscriptionTitle(data) },
  })
  res.status(201).json(subscription)
})

subscriptionsRouter.patch('/:id', requireAuth, async (req, res) => {
  const body = z
    .object({ muted: z.boolean().optional(), title: z.string().min(1).max(80).optional() })
    .parse(req.body)
  const updated = await prisma.subscription.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: body,
  })
  if (updated.count === 0) throw new ApiError(404, 'Подписка не найдена')
  res.json({ ok: true, ...body })
})

subscriptionsRouter.delete('/:id', requireAuth, async (req, res) => {
  const deleted = await prisma.subscription.deleteMany({
    where: { id: req.params.id, userId: req.user.id },
  })
  if (deleted.count === 0) throw new ApiError(404, 'Подписка не найдена')
  res.json({ ok: true })
})

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { recalcUserRating } from '../services/reviews.js'
import { ApiError } from '../utils/errors.js'

export const reviewsRouter = Router()

function serializeReview(r) {
  return {
    id: r.id,
    kind: r.kind,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    project: r.project ? { id: r.project.id, title: r.project.title } : null,
    author: r.author ? { id: r.author.id, name: r.author.name } : null,
    appeal: r.appeals?.[0]
      ? { id: r.appeals[0].id, status: r.appeals[0].status, resolution: r.appeals[0].resolution }
      : null,
  }
}

// Отзывы обо мне: отсюда можно обжаловать несправедливую оценку
reviewsRouter.get('/mine', requireAuth, async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { subjectId: req.user.id, hiddenAt: null },
    orderBy: { createdAt: 'desc' },
    include: { author: true, project: true, appeals: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })
  res.json(reviews.map(serializeReview))
})

reviewsRouter.post('/:id/appeal', requireAuth, async (req, res) => {
  const { reason } = z.object({ reason: z.string().min(10).max(1000) }).parse(req.body)
  const review = await prisma.review.findUnique({
    where: { id: req.params.id },
    include: { appeals: true },
  })
  if (!review || review.hiddenAt) throw new ApiError(404, 'Отзыв не найден')
  if (review.subjectId !== req.user.id) {
    throw new ApiError(403, 'Обжаловать можно только отзыв о себе')
  }
  if (review.appeals.some((a) => a.status === 'PENDING')) {
    throw new ApiError(409, 'Обжалование уже на рассмотрении')
  }
  if (review.appeals.some((a) => a.status === 'REJECTED')) {
    throw new ApiError(409, 'Обжалование по этому отзыву уже рассмотрено')
  }
  const appeal = await prisma.reviewAppeal.create({
    data: { reviewId: review.id, authorId: req.user.id, reason: reason.trim() },
  })
  res.status(201).json(appeal)
})

// --- Сторона владельца ---

reviewsRouter.get('/appeals', requireAuth, requireAdmin, async (req, res) => {
  const { status } = z
    .object({ status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'ALL']).default('PENDING') })
    .parse(req.query)
  const appeals = await prisma.reviewAppeal.findMany({
    where: status === 'ALL' ? {} : { status },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      author: true,
      review: { include: { author: true, project: true, subject: true } },
    },
  })
  res.json(
    appeals.map((a) => ({
      id: a.id,
      reason: a.reason,
      status: a.status,
      resolution: a.resolution,
      createdAt: a.createdAt,
      resolvedAt: a.resolvedAt,
      appellant: { id: a.author.id, name: a.author.name, phone: a.author.phone },
      review: {
        id: a.review.id,
        rating: a.review.rating,
        comment: a.review.comment,
        createdAt: a.review.createdAt,
        hidden: Boolean(a.review.hiddenAt),
        author: { id: a.review.author.id, name: a.review.author.name },
        project: { id: a.review.project.id, title: a.review.project.title },
      },
    })),
  )
})

// Удовлетворить — отзыв скрывается и уходит из рейтинга; отклонить — остается
reviewsRouter.post('/appeals/:id/resolve', requireAuth, requireAdmin, async (req, res) => {
  const { decision, resolution } = z
    .object({
      decision: z.enum(['ACCEPTED', 'REJECTED']),
      resolution: z.string().max(1000).optional(),
    })
    .parse(req.body)
  const appeal = await prisma.reviewAppeal.findUnique({
    where: { id: req.params.id },
    include: { review: true },
  })
  if (!appeal) throw new ApiError(404, 'Обжалование не найдено')
  if (appeal.status !== 'PENDING') throw new ApiError(409, 'Обжалование уже рассмотрено')

  await prisma.$transaction(async (tx) => {
    await tx.reviewAppeal.update({
      where: { id: appeal.id },
      data: { status: decision, resolution: resolution?.trim() || null, resolvedAt: new Date() },
    })
    if (decision === 'ACCEPTED') {
      await tx.review.update({ where: { id: appeal.reviewId }, data: { hiddenAt: new Date() } })
    }
  })
  if (decision === 'ACCEPTED') await recalcUserRating(appeal.review.subjectId)
  res.json({ ok: true, status: decision })
})

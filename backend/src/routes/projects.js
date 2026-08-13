import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { fundProject, completeProject, refundEscrow } from '../services/escrow.js'
import { maskContacts } from '../services/moderation.js'
import { assertTransition } from '../services/projectStateMachine.js'
import { REVIEW_TAGS, resolveReviewTarget, recalcUserRating } from '../services/reviews.js'
import { FEED_SORTS, buildFeedOrder } from '../services/feedSort.js'
import { ApiError } from '../utils/errors.js'
import { publicUser } from '../utils/serializers.js'

const projectInclude = { client: true, freelancer: true, transactions: true }

// Статусы, видимые всем в ленте и по прямой ссылке
const PUBLIC_STATUSES = ['OPEN', 'FUNDED', 'IN_PROGRESS', 'COMPLETED']

// Отклики принимаются на любой опубликованный проект — с эскроу и без
const APPLIABLE_STATUSES = ['OPEN', 'FUNDED']

function serializeProject(p) {
  const transactions = p.transactions ?? []
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    budget: p.budget,
    currency: p.currency,
    tags: p.tags,
    deadline: p.deadline,
    status: p.status,
    // бейдж «Оплата гарантирована»: бюджет прямо сейчас заморожен в эскроу
    escrowActive: transactions.some((t) => t.status === 'HOLDED'),
    // сделка завершена с выплатой через эскроу
    escrowReleased: transactions.some((t) => t.status === 'RELEASED'),
    client: publicUser(p.client),
    freelancer: p.freelancer ? publicUser(p.freelancer) : null,
    createdAt: p.createdAt,
  }
}

async function getProject(id) {
  const project = await prisma.project.findUnique({ where: { id }, include: projectInclude })
  if (!project) throw new ApiError(404, 'Проект не найден')
  return project
}

function assertOwner(project, user) {
  if (project.clientId !== user.id) throw new ApiError(403, 'Действие доступно только заказчику проекта')
}

export const projectsRouter = Router()

// Лента: только проекты с замороженным бюджетом
projectsRouter.get('/', async (req, res) => {
  const q = z
    .object({
      tag: z.string().optional(),
      search: z.string().optional(),
      sort: z.enum(FEED_SORTS).default('escrow'),
      take: z.coerce.number().int().min(1).max(50).default(20),
      skip: z.coerce.number().int().min(0).default(0),
    })
    .parse(req.query)
  const where = {
    status: { in: APPLIABLE_STATUSES },
    ...(q.tag ? { tags: { has: q.tag } } : {}),
    ...(q.search
      ? {
          OR: [
            { title: { contains: q.search, mode: 'insensitive' } },
            { description: { contains: q.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
  const projects = await prisma.project.findMany({
    where,
    include: projectInclude,
    orderBy: buildFeedOrder(q.sort),
    take: q.take,
    skip: q.skip,
  })
  res.json(projects.map(serializeProject))
})

projectsRouter.get('/mine', requireAuth, async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { OR: [{ clientId: req.user.id }, { freelancerId: req.user.id }] },
    include: projectInclude,
    orderBy: { updatedAt: 'desc' },
  })
  res.json(projects.map(serializeProject))
})

projectsRouter.post('/', requireAuth, async (req, res) => {
  const data = z
    .object({
      title: z.string().min(5).max(120),
      description: z.string().min(20).max(10000),
      budget: z.number().int().positive(),
      currency: z.string().max(3).default('RUB'),
      tags: z.array(z.string().min(1).max(30)).max(10).default([]),
      deadline: z.coerce.date().optional(),
    })
    .parse(req.body)
  const project = await prisma.project.create({
    data: { ...data, clientId: req.user.id },
    include: projectInclude,
  })
  res.status(201).json(serializeProject(project))
})

projectsRouter.get('/:id', optionalAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  const isParticipant =
    req.user && (req.user.id === project.clientId || req.user.id === project.freelancerId)
  if (!PUBLIC_STATUSES.includes(project.status) && !isParticipant) {
    throw new ApiError(404, 'Проект не найден')
  }
  res.json(serializeProject(project))
})

// Публикация без эскроу: проект попадает в ленту, но без бейджа «Оплата гарантирована»
projectsRouter.post('/:id/publish', requireAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  assertOwner(project, req.user)
  assertTransition(project.status, 'OPEN')
  await prisma.project.update({ where: { id: project.id }, data: { status: 'OPEN' } })
  res.json(serializeProject(await getProject(project.id)))
})

// Заморозка бюджета (из черновика или уже открытого проекта):
// бейдж «Оплата гарантирована» и приоритет в ленте
projectsRouter.post('/:id/fund', requireAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  assertOwner(project, req.user)
  const result = await fundProject(project)
  res.json({
    ...serializeProject(await getProject(project.id)),
    ...(result.confirmationUrl ? { confirmationUrl: result.confirmationUrl } : {}),
  })
})

// Приемка работы заказчиком: при эскроу деньги уходят фрилансеру
projectsRouter.post('/:id/complete', requireAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  assertOwner(project, req.user)
  await completeProject(project)
  res.json(serializeProject(await getProject(project.id)))
})

projectsRouter.post('/:id/cancel', requireAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  assertOwner(project, req.user)
  if (project.status === 'IN_PROGRESS') {
    throw new ApiError(409, 'Проект в работе: отмена только через арбитраж поддержки')
  }
  await refundEscrow(project)
  res.json(serializeProject(await getProject(project.id)))
})

// «Предложить себя»: короткий питч, один отклик на проект
projectsRouter.post('/:id/applications', requireAuth, async (req, res) => {
  const { pitch } = z.object({ pitch: z.string().min(10).max(1000) }).parse(req.body)
  const project = await getProject(req.params.id)
  if (project.clientId === req.user.id) throw new ApiError(400, 'Нельзя откликнуться на свой проект')
  if (!APPLIABLE_STATUSES.includes(project.status)) {
    throw new ApiError(409, 'Проект не принимает отклики')
  }
  try {
    const application = await prisma.application.create({
      data: { projectId: project.id, freelancerId: req.user.id, pitch },
    })
    res.status(201).json(application)
  } catch (e) {
    if (e.code === 'P2002') throw new ApiError(409, 'Вы уже откликнулись на этот проект')
    throw e
  }
})

projectsRouter.get('/:id/applications', requireAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  assertOwner(project, req.user)
  const applications = await prisma.application.findMany({
    where: { projectId: project.id },
    include: { freelancer: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(
    applications.map((a) => ({
      id: a.id,
      pitch: a.pitch,
      status: a.status,
      createdAt: a.createdAt,
      freelancer: publicUser(a.freelancer),
    })),
  )
})

// Чат сделки: диалог заказчик ↔ фрилансер в рамках проекта.
// Заказчик выбирает собеседника (?with=<freelancerId>), фрилансер всегда пишет заказчику.
projectsRouter.get('/:id/messages', requireAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  const peerId = await resolvePeer(project, req.user, req.query.with)
  // Открытие диалога отмечает входящие от собеседника прочитанными
  await prisma.message.updateMany({
    where: { projectId: project.id, senderId: peerId, recipientId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  })
  const messages = await prisma.message.findMany({
    where: {
      projectId: project.id,
      OR: [
        { senderId: req.user.id, recipientId: peerId },
        { senderId: peerId, recipientId: req.user.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })
  res.json(messages)
})

projectsRouter.post('/:id/messages', requireAuth, async (req, res) => {
  const body = z
    .object({ text: z.string().min(1).max(5000), with: z.string().optional() })
    .parse(req.body)
  const project = await getProject(req.params.id)
  const peerId = await resolvePeer(project, req.user, body.with)
  const { text, wasMasked } = maskContacts(body.text)
  const message = await prisma.message.create({
    data: { projectId: project.id, senderId: req.user.id, recipientId: peerId, text, wasMasked },
  })
  res.status(201).json(message)
})

// Двусторонняя оценка по проекту. Фрилансер оценивает заказчика (гейт — диалог;
// теги после диалога, звезды после сделки), заказчик — исполнителя (звезды после
// завершения). Повторная оценка возможна только как «апгрейд» DIALOG → DEAL.
projectsRouter.post('/:id/reviews', requireAuth, async (req, res) => {
  const body = z
    .object({
      rating: z.number().int().min(1).max(5).optional(),
      tags: z.array(z.enum(REVIEW_TAGS)).max(3).default([]),
      comment: z.string().max(500).optional(),
    })
    .parse(req.body)
  const project = await getProject(req.params.id)
  const target = resolveReviewTarget(project, req.user.id)
  if (!target.allowed || !target.subjectId) {
    throw new ApiError(409, 'Оценка исполнителя доступна после завершения сделки')
  }
  if (target.subjectId === req.user.id) throw new ApiError(400, 'Нельзя оценить самого себя')
  if (!target.allowTags && body.tags.length > 0) {
    throw new ApiError(400, 'Факт-теги доступны только при оценке заказчика')
  }

  if (target.requiresDialog) {
    const hasDialog = await prisma.message.findFirst({
      where: {
        projectId: project.id,
        OR: [
          { senderId: req.user.id, recipientId: target.subjectId },
          { senderId: target.subjectId, recipientId: req.user.id },
        ],
      },
    })
    if (!hasDialog) throw new ApiError(403, 'Оценка доступна после диалога с заказчиком')
  }

  if (target.kind === 'DEAL' && !body.rating) throw new ApiError(400, 'Поставьте оценку от 1 до 5')
  if (target.kind === 'DIALOG') {
    if (body.rating) {
      throw new ApiError(400, 'Звезды доступны после завершенной сделки — сейчас можно оставить факт-теги')
    }
    if (body.tags.length === 0) throw new ApiError(400, 'Выберите хотя бы один тег')
  }

  const existing = await prisma.review.findUnique({
    where: { projectId_authorId: { projectId: project.id, authorId: req.user.id } },
  })
  let review
  if (existing) {
    if (existing.kind === 'DEAL' || target.kind === 'DIALOG') {
      throw new ApiError(409, 'Вы уже оставили оценку по этому проекту')
    }
    review = await prisma.review.update({
      where: { id: existing.id },
      data: { kind: target.kind, rating: body.rating, tags: body.tags, comment: body.comment },
    })
  } else {
    review = await prisma.review.create({
      data: {
        kind: target.kind,
        rating: body.rating,
        tags: body.tags,
        comment: body.comment,
        projectId: project.id,
        subjectId: target.subjectId,
        authorId: req.user.id,
      },
    })
  }
  if (target.kind === 'DEAL') await recalcUserRating(target.subjectId)
  res.status(201).json(review)
})

async function resolvePeer(project, user, withId) {
  if (user.id === project.clientId) {
    const peerId = withId ?? project.freelancerId
    if (!peerId) throw new ApiError(400, 'Укажите собеседника: with=<freelancerId>')
    if (peerId !== project.freelancerId) {
      const application = await prisma.application.findUnique({
        where: { projectId_freelancerId: { projectId: project.id, freelancerId: peerId } },
      })
      if (!application) throw new ApiError(403, 'Этот пользователь не откликался на проект')
    }
    return peerId
  }
  if (user.id !== project.freelancerId) {
    const application = await prisma.application.findUnique({
      where: { projectId_freelancerId: { projectId: project.id, freelancerId: user.id } },
    })
    if (!application) throw new ApiError(403, 'Чат доступен после отклика на проект')
  }
  return project.clientId
}

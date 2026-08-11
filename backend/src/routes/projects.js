import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { fundProject, releaseEscrow, refundEscrow } from '../services/escrow.js'
import { maskContacts } from '../services/moderation.js'
import { ApiError } from '../utils/errors.js'
import { publicUser } from '../utils/serializers.js'

const projectInclude = { client: true, freelancer: true }

// Статусы, видимые всем в ленте и по прямой ссылке
const PUBLIC_STATUSES = ['FUNDED', 'IN_PROGRESS', 'COMPLETED']

function serializeProject(p) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    budget: p.budget,
    currency: p.currency,
    tags: p.tags,
    deadline: p.deadline,
    status: p.status,
    // бейдж «Оплата гарантирована»: бюджет заморожен в эскроу
    escrowActive: p.status === 'FUNDED' || p.status === 'IN_PROGRESS',
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
      take: z.coerce.number().int().min(1).max(50).default(20),
      skip: z.coerce.number().int().min(0).default(0),
    })
    .parse(req.query)
  const where = {
    status: 'FUNDED',
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
    orderBy: { createdAt: 'desc' },
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

// Заморозка бюджета — без нее проект не попадает в ленту
projectsRouter.post('/:id/fund', requireAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  assertOwner(project, req.user)
  await fundProject(project)
  res.json(serializeProject(await getProject(project.id)))
})

// Приемка работы заказчиком: деньги уходят фрилансеру
projectsRouter.post('/:id/complete', requireAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  assertOwner(project, req.user)
  await releaseEscrow(project)
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
  if (project.status !== 'FUNDED') {
    throw new ApiError(409, 'Отклики принимаются только на проекты с замороженным бюджетом')
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

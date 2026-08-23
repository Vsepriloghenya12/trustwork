import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { assertTransition } from '../services/projectStateMachine.js'
import { notifyApplicationAccepted } from '../services/notifications.js'
import { ApiError } from '../utils/errors.js'

export const applicationsRouter = Router()

applicationsRouter.get('/mine', requireAuth, async (req, res) => {
  const applications = await prisma.application.findMany({
    where: { freelancerId: req.user.id },
    include: { project: { include: { client: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(
    applications.map((a) => ({
      id: a.id,
      pitch: a.pitch,
      status: a.status,
      createdAt: a.createdAt,
      project: { id: a.project.id, title: a.project.title, status: a.project.status },
    })),
  )
})

// Выбор исполнителя: проект уходит в работу, остальные отклики отклоняются
applicationsRouter.post('/:id/accept', requireAuth, async (req, res) => {
  const application = await getApplication(req.params.id, req.user)
  if (application.status !== 'PENDING') throw new ApiError(409, 'Отклик уже обработан')
  assertTransition(application.project.status, 'IN_PROGRESS')
  const [accepted] = await prisma.$transaction([
    prisma.application.update({ where: { id: application.id }, data: { status: 'ACCEPTED' } }),
    prisma.application.updateMany({
      where: { projectId: application.projectId, id: { not: application.id } },
      data: { status: 'REJECTED' },
    }),
    prisma.project.update({
      where: { id: application.projectId },
      data: {
        status: 'IN_PROGRESS',
        freelancerId: application.freelancerId,
        // От этой даты считается молчание исполнителя
        startedAt: new Date(),
      },
    }),
  ])
  await notifyApplicationAccepted(application.project, application.freelancerId)
  res.json(accepted)
})

applicationsRouter.post('/:id/reject', requireAuth, async (req, res) => {
  const application = await getApplication(req.params.id, req.user)
  if (application.status !== 'PENDING') throw new ApiError(409, 'Отклик уже обработан')
  const rejected = await prisma.application.update({
    where: { id: application.id },
    data: { status: 'REJECTED' },
  })
  res.json(rejected)
})

async function getApplication(id, user) {
  const application = await prisma.application.findUnique({
    where: { id },
    include: { project: true },
  })
  if (!application) throw new ApiError(404, 'Отклик не найден')
  if (application.project.clientId !== user.id) {
    throw new ApiError(403, 'Действие доступно только заказчику проекта')
  }
  return application
}

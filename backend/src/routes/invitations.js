import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { visibleStatus } from '../services/invitations.js'
import { publicUser } from '../utils/serializers.js'
import { ApiError } from '../utils/errors.js'

export const invitationsRouter = Router()

function serialize(invitation) {
  return {
    id: invitation.id,
    status: visibleStatus(invitation),
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    project: invitation.project
      ? {
          id: invitation.project.id,
          title: invitation.project.title,
          budget: invitation.project.budget,
          currency: invitation.project.currency,
          tags: invitation.project.tags,
          deadline: invitation.project.deadline,
          escrowActive: (invitation.project.transactions ?? []).some((t) => t.status === 'HOLDED'),
          client: invitation.project.client ? publicUser(invitation.project.client) : null,
        }
      : null,
  }
}

// Приглашения, которые ждут ответа фрилансера
invitationsRouter.get('/mine', requireAuth, async (req, res) => {
  const list = await prisma.invitation.findMany({
    where: { freelancerId: req.user.id, status: { in: ['SENT', 'VIEWED'] } },
    orderBy: { createdAt: 'desc' },
    include: { project: { include: { client: true, transactions: true } } },
  })
  // Истекшие не показываем и больше не тревожим ими человека
  res.json(list.map(serialize).filter((i) => i.status !== 'EXPIRED'))
})

async function getPending(id, userId) {
  const invitation = await prisma.invitation.findUnique({
    where: { id },
    include: { project: true },
  })
  if (!invitation || invitation.freelancerId !== userId) {
    throw new ApiError(404, 'Приглашение не найдено')
  }
  if (visibleStatus(invitation) === 'EXPIRED') throw new ApiError(409, 'Приглашение истекло')
  if (!['SENT', 'VIEWED'].includes(invitation.status)) {
    throw new ApiError(409, 'На приглашение уже ответили')
  }
  return invitation
}

// Принять — это обычный отклик, но без барьера: комментарий необязателен
invitationsRouter.post('/:id/accept', requireAuth, async (req, res) => {
  const { comment } = z.object({ comment: z.string().max(1000).optional() }).parse(req.body)
  const invitation = await getPending(req.params.id, req.user.id)
  const project = invitation.project
  if (!['OPEN', 'FUNDED'].includes(project.status)) {
    throw new ApiError(409, 'Проект больше не принимает отклики')
  }

  const pitch = comment?.trim()
    ? `По приглашению заказчика. ${comment.trim()}`
    : 'По приглашению заказчика — готов взяться.'

  await prisma.$transaction(async (tx) => {
    await tx.application.upsert({
      where: { projectId_freelancerId: { projectId: project.id, freelancerId: req.user.id } },
      update: { pitch },
      create: { projectId: project.id, freelancerId: req.user.id, pitch },
    })
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    })
  })
  res.json({ ok: true, projectId: project.id })
})

invitationsRouter.post('/:id/decline', requireAuth, async (req, res) => {
  const invitation = await getPending(req.params.id, req.user.id)
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'DECLINED', respondedAt: new Date() },
  })
  res.json({ ok: true })
})

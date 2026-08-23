import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { settleDispute, refundEscrow } from '../services/escrow.js'
import { daysFromNow, RULES } from '../services/pricing.js'
import { notifyDisputeResolved, notifyPayoutStatusRequired } from '../services/notifications.js'
import { ApiError } from '../utils/errors.js'
import { publicUser } from '../utils/serializers.js'

export const arbitrationRouter = Router()
arbitrationRouter.use(requireAuth, requireAdmin)

const projectInclude = { client: true, freelancer: true, transactions: true }

function shortProject(p) {
  return {
    id: p.id,
    title: p.title,
    budget: p.budget,
    status: p.status,
    payoutDueAt: p.payoutDueAt,
    acceptedAt: p.acceptedAt,
    client: publicUser(p.client),
    freelancer: p.freelancer ? publicUser(p.freelancer) : null,
  }
}

// Споры. Пока идут первые три дня, стороны разбираются сами — поддержка видит
// такие споры отдельно и без необходимости вмешиваться.
arbitrationRouter.get('/disputes', async (req, res) => {
  const disputes = await prisma.dispute.findMany({
    where: { status: { not: 'RESOLVED' } },
    orderBy: { supportAt: 'asc' },
    include: { project: { include: projectInclude }, openedBy: true },
  })
  const now = new Date()
  res.json(
    disputes.map((d) => ({
      id: d.id,
      reason: d.reason,
      status: d.status,
      supportAt: d.supportAt,
      // true — три дня вышли, дальше решает поддержка
      needsSupport: d.status === 'IN_SUPPORT' || d.supportAt <= now,
      createdAt: d.createdAt,
      openedBy: publicUser(d.openedBy),
      project: shortProject(d.project),
    })),
  )
})

// Решение по спору: сколько из бюджета уходит исполнителю. Ноль — деньги
// возвращаются заказчику целиком; комиссия берется только с выплаченной части.
arbitrationRouter.post('/disputes/:id/resolve', async (req, res) => {
  const { payoutToFreelancer, resolution } = z
    .object({
      payoutToFreelancer: z.number().int().min(0),
      resolution: z.string().min(5).max(2000),
    })
    .parse(req.body)

  const dispute = await prisma.dispute.findUnique({
    where: { id: req.params.id },
    include: { project: { include: projectInclude } },
  })
  if (!dispute) throw new ApiError(404, 'Спор не найден')
  if (dispute.status === 'RESOLVED') throw new ApiError(409, 'Спор уже разобран')

  const project = dispute.project
  if (payoutToFreelancer > project.budget) {
    throw new ApiError(400, 'Выплата не может превышать бюджет проекта')
  }

  const result = await settleDispute(project, payoutToFreelancer)
  await prisma.$transaction([
    prisma.dispute.update({
      where: { id: dispute.id },
      data: {
        status: 'RESOLVED',
        payoutToFreelancer: result.payout,
        resolution,
        resolvedAt: new Date(),
      },
    }),
    prisma.project.update({
      where: { id: project.id },
      data: {
        status: result.payout > 0 ? 'COMPLETED' : 'CANCELLED',
        payoutDueAt: null,
        cancelRequestedById: null,
        cancelRequestedAt: null,
      },
    }),
  ])

  await notifyDisputeResolved(project, project.clientId, result.payout)
  if (project.freelancerId) await notifyDisputeResolved(project, project.freelancerId, result.payout)
  res.json({ ...result, resolution })
})

// Деньги, застрявшие из-за неоформленного статуса исполнителя
arbitrationRouter.get('/payouts', async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { status: 'AWAITING_PAYOUT' },
    orderBy: { payoutDueAt: 'asc' },
    include: projectInclude,
  })
  const now = new Date()
  res.json(
    projects.map((p) => ({
      ...shortProject(p),
      // срок вышел — поддержка либо продлевает, либо возвращает деньги заказчику
      overdue: Boolean(p.payoutDueAt && p.payoutDueAt <= now),
      daysLeft: p.payoutDueAt ? Math.ceil((p.payoutDueAt - now) / 86400000) : null,
    })),
  )
})

// Первый рычаг поддержки: продлить ожидание, если человек реально оформляется
arbitrationRouter.post('/payouts/:projectId/extend', async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId } })
  if (!project) throw new ApiError(404, 'Проект не найден')
  if (project.status !== 'AWAITING_PAYOUT') throw new ApiError(409, 'Проект не ждет выплаты')

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { payoutDueAt: daysFromNow(RULES.payoutStatusDays) },
  })
  await notifyPayoutStatusRequired(updated, RULES.payoutStatusDays)
  res.json({ payoutDueAt: updated.payoutDueAt })
})

// Второй рычаг: закрыть с возвратом заказчику. Больше поддержка сделать не может —
// перечислить деньги человеку без статуса самозанятого платформа не вправе.
arbitrationRouter.post('/payouts/:projectId/close', async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.projectId },
    include: projectInclude,
  })
  if (!project) throw new ApiError(404, 'Проект не найден')
  if (project.status !== 'AWAITING_PAYOUT') throw new ApiError(409, 'Проект не ждет выплаты')

  const result = await settleDispute(project, 0)
  await prisma.project.update({
    where: { id: project.id },
    data: { status: 'CANCELLED', payoutDueAt: null },
  })
  await notifyDisputeResolved(project, project.clientId, 0)
  if (project.freelancerId) await notifyDisputeResolved(project, project.freelancerId, 0)
  res.json(result)
})

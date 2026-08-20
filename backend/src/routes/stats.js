import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const statsRouter = Router()

// Публичные цифры платформы: сколько денег сейчас под защитой и что открыто.
// Это главный аргумент доверия — показываем его прямо в ленте.
statsRouter.get('/', async (req, res) => {
  const [escrow, openProjects, freelancers, completed] = await Promise.all([
    prisma.transaction.aggregate({ where: { status: 'HOLDED' }, _sum: { amount: true } }),
    prisma.project.count({ where: { status: { in: ['OPEN', 'FUNDED'] } } }),
    prisma.user.count({ where: { role: 'FREELANCER' } }),
    prisma.project.count({ where: { status: 'COMPLETED' } }),
  ])
  res.json({
    escrowHeld: escrow._sum.amount ?? 0,
    openProjects,
    freelancers,
    completedDeals: completed,
  })
})

import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { paymentProvider } from '../services/payments/index.js'

export const paymentsRouter = Router()

// Вебхук ЮKassa. Статус платежа не берем из тела запроса —
// перепроверяем у API (защита от поддельных уведомлений).
paymentsRouter.post('/yookassa/webhook', async (req, res) => {
  const paymentId = req.body?.object?.id
  if (!paymentId || paymentProvider.name !== 'yookassa') return res.json({ ok: true })

  const txn = await prisma.transaction.findFirst({ where: { externalId: paymentId } })
  if (!txn || txn.status !== 'PENDING') return res.json({ ok: true })

  const status = await paymentProvider.getStatus(paymentId)
  if (status === 'waiting_for_capture') {
    // Пользователь оплатил: деньги захолдированы → проект получает бейдж эскроу
    await prisma.$transaction([
      prisma.transaction.update({ where: { id: txn.id }, data: { status: 'HOLDED' } }),
      prisma.project.update({ where: { id: txn.projectId }, data: { status: 'FUNDED' } }),
    ])
  } else if (status === 'canceled') {
    await prisma.transaction.update({ where: { id: txn.id }, data: { status: 'REFUNDED' } })
  }
  res.json({ ok: true })
})

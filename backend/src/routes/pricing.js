import { Router } from 'express'
import { z } from 'zod'
import {
  PUBLICATION_FEE,
  ESCROW_FEE,
  RULES,
  billingEnabled,
  publicationFee,
  regularPublicationFee,
  escrowFeeDue,
  regularEscrowFee,
  escrowCharge,
} from '../services/pricing.js'

export const pricingRouter = Router()

// Сколько будет стоить проект. Интерфейс спрашивает это до публикации, чтобы
// заказчик видел точную сумму, а не считал проценты в уме.
// regular — тариф как он есть; fee — что спишется сейчас (в бесплатный период это 0).
pricingRouter.get('/', (req, res) => {
  const { budget, feePaid } = z
    .object({
      budget: z.coerce.number().int().positive().max(100_000_000),
      feePaid: z.coerce.number().int().min(0).default(0),
    })
    .parse(req.query)

  res.json({
    billingEnabled,
    publication: {
      fee: publicationFee(budget),
      regular: regularPublicationFee(budget),
      rate: PUBLICATION_FEE.rate,
      min: PUBLICATION_FEE.min,
      cap: PUBLICATION_FEE.cap,
    },
    escrow: {
      // с учетом уже уплаченного за публикацию
      fee: escrowFeeDue(budget, feePaid),
      regular: regularEscrowFee(budget),
      rate: ESCROW_FEE.rate,
      min: ESCROW_FEE.min,
      cap: null,
      // столько спишется с заказчика: бюджет плюс комиссия сверху
      total: escrowCharge(budget, feePaid),
      // исполнитель получает бюджет целиком, без вычетов
      payout: budget,
    },
    rules: RULES,
  })
})

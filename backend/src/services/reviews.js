import { prisma } from '../lib/prisma.js'

// Факт-теги: их сложно накрутить и они информативнее звезд
export const REVIEW_TAGS = [
  'не отвечает',
  'просит бесплатное тестовое',
  'уводит в мессенджер',
  'вежливое общение',
  'конкретное ТЗ',
  'быстро отвечает',
]

// DEAL (звезды) — только исполнитель завершенной сделки; иначе DIALOG (факт-теги)
export function determineReviewKind(project, authorId) {
  return project.status === 'COMPLETED' && project.freelancerId === authorId ? 'DEAL' : 'DIALOG'
}

// Рейтинг заказчика считается только по DEAL-отзывам
export async function recalcClientRating(clientId) {
  const agg = await prisma.review.aggregate({
    where: { clientId, kind: 'DEAL' },
    _avg: { rating: true },
    _count: true,
  })
  await prisma.user.update({
    where: { id: clientId },
    data: { rating: agg._avg.rating ?? 0, reviewsCount: agg._count },
  })
}

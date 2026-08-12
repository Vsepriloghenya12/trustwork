import { prisma } from '../lib/prisma.js'

// Факт-теги о заказчике: их сложно накрутить и они информативнее звезд
export const REVIEW_TAGS = [
  'не отвечает',
  'просит бесплатное тестовое',
  'уводит в мессенджер',
  'вежливое общение',
  'конкретное ТЗ',
  'быстро отвечает',
]

// Кто кого оценивает и на каких условиях — единственная точка правды.
// Заказчик → исполнитель: только звезды после завершенной сделки, диалог не требуется
// (сам факт найма — достаточная связь). Фрилансер → заказчик: после реального
// диалога факт-теги, после завершенной сделки — звезды.
export function resolveReviewTarget(project, authorId) {
  if (authorId === project.clientId) {
    return {
      subjectId: project.freelancerId,
      kind: 'DEAL',
      requiresDialog: false,
      allowTags: false,
      allowed: project.status === 'COMPLETED' && Boolean(project.freelancerId),
    }
  }
  const isDeal = project.status === 'COMPLETED' && project.freelancerId === authorId
  return {
    subjectId: project.clientId,
    kind: isDeal ? 'DEAL' : 'DIALOG',
    requiresDialog: true,
    allowTags: true,
    allowed: true,
  }
}

// Рейтинг пользователя считается только по DEAL-отзывам
export async function recalcUserRating(subjectId) {
  const agg = await prisma.review.aggregate({
    where: { subjectId, kind: 'DEAL' },
    _avg: { rating: true },
    _count: true,
  })
  await prisma.user.update({
    where: { id: subjectId },
    data: { rating: agg._avg.rating ?? 0, reviewsCount: agg._count },
  })
}

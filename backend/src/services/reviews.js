import { prisma } from '../lib/prisma.js'

// Кто кого оценивает и на каких условиях — единственная точка правды.
// Заказчик → исполнитель: звезды после завершенной сделки, диалог не требуется
// (сам факт найма — достаточная связь). Фрилансер → заказчик: после реального
// диалога — отзыв текстом (в рейтинг не идет), после завершенной сделки — звезды.
export function resolveReviewTarget(project, authorId) {
  if (authorId === project.clientId) {
    return {
      subjectId: project.freelancerId,
      kind: 'DEAL',
      requiresDialog: false,
      allowed: project.status === 'COMPLETED' && Boolean(project.freelancerId),
    }
  }
  const isDeal = project.status === 'COMPLETED' && project.freelancerId === authorId
  return {
    subjectId: project.clientId,
    kind: isDeal ? 'DEAL' : 'DIALOG',
    requiresDialog: true,
    allowed: true,
  }
}

// Рейтинг пользователя считается только по DEAL-отзывам; скрытые по итогам
// обжалования в расчет не идут
export async function recalcUserRating(subjectId) {
  const agg = await prisma.review.aggregate({
    where: { subjectId, kind: 'DEAL', hiddenAt: null },
    _avg: { rating: true },
    _count: true,
  })
  await prisma.user.update({
    where: { id: subjectId },
    data: { rating: agg._avg.rating ?? 0, reviewsCount: agg._count },
  })
}

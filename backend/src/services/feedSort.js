// Порядок ленты. escrow — по умолчанию: FUNDED раньше OPEN за счет порядка
// значений enum в Postgres (OPEN добавлен последним).
export const FEED_SORTS = ['escrow', 'rating', 'budget', 'new']

export function buildFeedOrder(sort) {
  switch (sort) {
    case 'rating':
      return [{ client: { rating: 'desc' } }, { createdAt: 'desc' }]
    case 'budget':
      return [{ budget: 'desc' }, { createdAt: 'desc' }]
    case 'new':
      return [{ createdAt: 'desc' }]
    default:
      return [{ status: 'asc' }, { createdAt: 'desc' }]
  }
}

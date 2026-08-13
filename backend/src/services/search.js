// Поиск по ленте. Русские слова ищем по основе: «йога» должна находить «йоги»,
// «тексты» — «текст». Полноценную морфологию (to_tsvector) добавим, когда
// проектов станет много; для ленты этой эвристики достаточно.
const MAX_TERMS = 4
const MIN_STEM_LENGTH = 4

export function buildSearchTerms(query) {
  return String(query)
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, MAX_TERMS)
    .map((word) => (word.length >= MIN_STEM_LENGTH ? word.slice(0, -1) : word))
}

// Каждое слово запроса должно встретиться в заголовке или описании
export function buildSearchFilter(query) {
  const terms = buildSearchTerms(query)
  if (terms.length === 0) return undefined
  return {
    AND: terms.map((term) => ({
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    })),
  }
}

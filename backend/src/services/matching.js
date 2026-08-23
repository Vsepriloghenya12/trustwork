import { prisma } from '../lib/prisma.js'
import { buildSearchTerms } from './search.js'

// Подходящий исполнитель — тот, у кого хотя бы один навык совпал с тегом задачи.
export function countMatches(skills, tags) {
  const normalized = new Set((tags ?? []).map((t) => t.toLowerCase().trim()))
  return (skills ?? []).filter((s) => normalized.has(s.toLowerCase().trim())).length
}

// Порядок: больше совпадений — выше; при равенстве выше новые профили,
// чтобы у недавно пришедших был шанс попасть в первую пятерку.
export function rankCandidates(users, tags) {
  return users
    .map((user) => ({ user, matches: countMatches(user.skills, tags) }))
    .filter((c) => c.matches > 0)
    .sort((a, b) => b.matches - a.matches || b.user.createdAt - a.user.createdAt)
}

const CANDIDATE_POOL = 300

// Кандидаты для проекта: исключаем заказчика, уже откликнувшихся и уже приглашенных.
// Совпадение по массиву навыков в Postgres не отсортировать одним запросом,
// поэтому берем пул подходящих и ранжируем в памяти.
export async function findCandidates(project) {
  if (!project.tags?.length) return []

  const [applied, invited] = await Promise.all([
    prisma.application.findMany({
      where: { projectId: project.id },
      select: { freelancerId: true },
    }),
    prisma.invitation.findMany({
      where: { projectId: project.id },
      select: { freelancerId: true },
    }),
  ])
  const busy = new Set([
    project.clientId,
    project.freelancerId,
    ...applied.map((a) => a.freelancerId),
    ...invited.map((i) => i.freelancerId),
  ])

  const pool = await prisma.user.findMany({
    where: { role: 'FREELANCER', skills: { hasSome: project.tags } },
    orderBy: { createdAt: 'desc' },
    take: CANDIDATE_POOL,
  })

  return rankCandidates(
    pool.filter((u) => !busy.has(u.id)),
    project.tags,
  )
}

// Подходит ли проект под условия подписки. Условия те же, что в ленте.
export function subscriptionMatches(subscription, project, { escrowActive }) {
  if (subscription.muted) return false
  if (subscription.userId === project.clientId) return false
  if (subscription.tag && !project.tags.includes(subscription.tag)) return false
  if (subscription.minBudget && project.budget < subscription.minBudget) return false
  if (subscription.escrowOnly && !escrowActive) return false
  if (subscription.search) {
    const haystack = `${project.title} ${project.description}`.toLowerCase()
    const terms = buildSearchTerms(subscription.search)
    if (!terms.every((term) => haystack.includes(term.toLowerCase()))) return false
  }
  return true
}

// Название подписки собираем из условий, чтобы человек узнавал ее в списке
export function subscriptionTitle({ tag, search, minBudget, escrowOnly }) {
  const parts = []
  if (search) parts.push(`«${search}»`)
  if (tag) parts.push(tag)
  if (!parts.length) parts.push('Все проекты')
  if (minBudget) parts.push(`от ${minBudget.toLocaleString('ru-RU')} ₽`)
  if (escrowOnly) parts.push('с эскроу')
  return parts.join(' · ').slice(0, 80)
}

import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { ApiError } from '../utils/errors.js'
import { publicUser, privateUser } from '../utils/serializers.js'

export const usersRouter = Router()

// У заказчика вместо «сделок с эскроу» показываем работу с проектами:
// сколько размещено, сколько открыто, сколько в работе и сколько денег в эскроу
async function withRoleStats(user, serialize) {
  const base = serialize(user)
  if (user.role !== 'CLIENT') return base
  const [grouped, escrow] = await Promise.all([
    prisma.project.groupBy({
      by: ['status'],
      where: { clientId: user.id, status: { not: 'DRAFT' } },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { status: 'HOLDED', project: { clientId: user.id } },
      _sum: { amount: true },
    }),
  ])
  const countOf = (...statuses) =>
    grouped.filter((g) => statuses.includes(g.status)).reduce((sum, g) => sum + g._count, 0)
  return {
    ...base,
    postedProjects: grouped.reduce((sum, g) => sum + g._count, 0),
    openProjects: countOf('OPEN', 'FUNDED', 'PENDING_PAYMENT'),
    inProgressProjects: countOf('IN_PROGRESS'),
    completedProjects: countOf('COMPLETED'),
    escrowHeld: escrow._sum.amount ?? 0,
  }
}

usersRouter.get('/me', requireAuth, async (req, res) => {
  res.json(await withRoleStats(req.user, privateUser))
})

usersRouter.patch('/me', requireAuth, async (req, res) => {
  const data = z
    .object({
      name: z.string().min(1).max(100).optional(),
      role: z.enum(['CLIENT', 'FREELANCER']).optional(),
      bio: z.string().max(2000).optional(),
      skills: z.array(z.string().min(1).max(40)).max(20).optional(),
      telegram: z.string().max(100).optional(),
      github: z.string().max(100).optional(),
    })
    .parse(req.body)
  const user = await prisma.user.update({ where: { id: req.user.id }, data })
  res.json(await withRoleStats(user, privateUser))
})

// Непрочитанные сообщения: всего и по проектам (для бейджей в навигации и списке чатов)
usersRouter.get('/me/unread', requireAuth, async (req, res) => {
  const grouped = await prisma.message.groupBy({
    by: ['projectId'],
    where: { recipientId: req.user.id, readAt: null },
    _count: true,
  })
  res.json({
    total: grouped.reduce((sum, g) => sum + g._count, 0),
    byProject: Object.fromEntries(grouped.map((g) => [g.projectId, g._count])),
  })
})

// Фото профиля: до 2 МБ, только картинки. Клиент присылает уже уменьшенное.
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
})

const AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp']

usersRouter.put('/me/avatar', requireAuth, avatarUpload.single('file'), async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Файл не получен')
  if (!AVATAR_MIME.includes(req.file.mimetype)) {
    throw new ApiError(400, 'Подойдет JPG, PNG или WebP')
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatarData: req.file.buffer, avatarMime: req.file.mimetype, avatarAt: new Date() },
  })
  res.json(await withRoleStats(user, privateUser))
})

usersRouter.delete('/me/avatar', requireAuth, async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatarData: null, avatarMime: null, avatarAt: null },
  })
  res.json(await withRoleStats(user, privateUser))
})

usersRouter.get('/:id/avatar', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { avatarData: true, avatarMime: true, avatarAt: true },
  })
  if (!user?.avatarData) throw new ApiError(404, 'Фото не загружено')
  res.setHeader('Content-Type', user.avatarMime || 'image/jpeg')
  // Ссылка содержит метку времени, поэтому кэшировать можно надолго
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.send(Buffer.from(user.avatarData))
})

usersRouter.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) throw new ApiError(404, 'Пользователь не найден')
  res.json(await withRoleStats(user, publicUser))
})

// Отзывы о пользователе: сводка по видам + последние отзывы
usersRouter.get('/:id/reviews', async (req, res) => {
  const all = await prisma.review.findMany({
    where: { subjectId: req.params.id, hiddenAt: null },
    select: { kind: true },
  })
  const recent = await prisma.review.findMany({
    where: { subjectId: req.params.id, hiddenAt: null },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { author: true },
  })
  res.json({
    summary: {
      dealCount: all.filter((r) => r.kind === 'DEAL').length,
      dialogCount: all.filter((r) => r.kind === 'DIALOG').length,
    },
    reviews: recent.map((r) => ({
      id: r.id,
      kind: r.kind,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      author: { id: r.author.id, name: r.author.name },
    })),
  })
})

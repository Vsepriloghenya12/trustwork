import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import {
  MAX_FILE_SIZE,
  MAX_FILES_PER_PROJECT,
  ALLOWED_MIME,
  canDownloadFile,
  sanitizeFileName,
} from '../services/files.js'
import { ApiError } from '../utils/errors.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})

export const filesRouter = Router({ mergeParams: true })

async function getProject(id) {
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) throw new ApiError(404, 'Проект не найден')
  return project
}

async function hasApplied(projectId, userId) {
  if (!userId) return false
  const application = await prisma.application.findUnique({
    where: { projectId_freelancerId: { projectId, freelancerId: userId } },
  })
  return Boolean(application)
}

// Список вложений виден всем: закрытые помечены canDownload=false
filesRouter.get('/', optionalAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  const files = await prisma.projectFile.findMany({
    where: { projectId: project.id },
    select: { id: true, name: true, mimeType: true, size: true, visibility: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  const applied = await hasApplied(project.id, req.user?.id)
  res.json(
    files.map((f) => ({
      ...f,
      canDownload: canDownloadFile(f, project, req.user?.id, applied),
    })),
  )
})

filesRouter.post('/', requireAuth, upload.single('file'), async (req, res) => {
  const project = await getProject(req.params.id)
  if (project.clientId !== req.user.id) {
    throw new ApiError(403, 'Файлы к задаче прикрепляет заказчик')
  }
  if (!req.file) throw new ApiError(400, 'Файл не получен')
  if (!ALLOWED_MIME.includes(req.file.mimetype)) {
    throw new ApiError(400, 'Такой тип файла не поддерживается')
  }
  const { visibility } = z
    .object({ visibility: z.enum(['PUBLIC', 'APPLICANTS']).default('PUBLIC') })
    .parse(req.body)

  const count = await prisma.projectFile.count({ where: { projectId: project.id } })
  if (count >= MAX_FILES_PER_PROJECT) {
    throw new ApiError(409, `К задаче можно приложить не больше ${MAX_FILES_PER_PROJECT} файлов`)
  }

  const file = await prisma.projectFile.create({
    data: {
      projectId: project.id,
      name: sanitizeFileName(req.file.originalname),
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
      visibility,
    },
    select: { id: true, name: true, mimeType: true, size: true, visibility: true, createdAt: true },
  })
  res.status(201).json({ ...file, canDownload: true })
})

// Смена видимости уже загруженного файла
filesRouter.patch('/:fileId', requireAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  if (project.clientId !== req.user.id) throw new ApiError(403, 'Доступно только заказчику')
  const { visibility } = z
    .object({ visibility: z.enum(['PUBLIC', 'APPLICANTS']) })
    .parse(req.body)
  const file = await prisma.projectFile.updateMany({
    where: { id: req.params.fileId, projectId: project.id },
    data: { visibility },
  })
  if (file.count === 0) throw new ApiError(404, 'Файл не найден')
  res.json({ ok: true, visibility })
})

filesRouter.delete('/:fileId', requireAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  if (project.clientId !== req.user.id) throw new ApiError(403, 'Доступно только заказчику')
  const deleted = await prisma.projectFile.deleteMany({
    where: { id: req.params.fileId, projectId: project.id },
  })
  if (deleted.count === 0) throw new ApiError(404, 'Файл не найден')
  res.json({ ok: true })
})

filesRouter.get('/:fileId', optionalAuth, async (req, res) => {
  const project = await getProject(req.params.id)
  const file = await prisma.projectFile.findFirst({
    where: { id: req.params.fileId, projectId: project.id },
  })
  if (!file) throw new ApiError(404, 'Файл не найден')
  const applied = await hasApplied(project.id, req.user?.id)
  if (!canDownloadFile(file, project, req.user?.id, applied)) {
    throw new ApiError(403, 'Файл откроется после отклика на проект')
  }
  res.setHeader('Content-Type', file.mimeType)
  res.setHeader('Content-Length', file.size)
  // Только скачивание: содержимое не исполняется в браузере
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${sanitizeFileName(file.name)}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
  )
  res.send(Buffer.from(file.data))
})

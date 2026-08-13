export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const MAX_FILES_PER_PROJECT = 5

// Белый список: файлы отдаются только как вложение, но лишний риск не нужен
export const ALLOWED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

// Файл открывают: заказчик, назначенный исполнитель, а для PUBLIC — кто угодно.
// APPLICANTS — дополнительно те, кто уже откликнулся (питч = заявка на ТЗ).
export function canDownloadFile(file, project, userId, hasApplication) {
  if (file.visibility === 'PUBLIC') return true
  if (!userId) return false
  if (userId === project.clientId || userId === project.freelancerId) return true
  return Boolean(hasApplication)
}

// Имя файла для заголовка ответа: без кавычек и переводов строк
export function sanitizeFileName(name) {
  return name.replace(/[\r\n"\\]/g, '_').slice(0, 120) || 'file'
}

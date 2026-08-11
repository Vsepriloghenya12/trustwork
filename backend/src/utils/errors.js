export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function errorHandler(err, req, res, next) {
  if (err?.name === 'ZodError') {
    return res.status(400).json({ error: 'Некорректные данные', details: err.issues })
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message })
  }
  console.error(err)
  res.status(500).json({ error: 'Внутренняя ошибка сервера' })
}

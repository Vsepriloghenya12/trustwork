import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { projectsRouter } from './routes/projects.js'
import { applicationsRouter } from './routes/applications.js'
import { paymentsRouter } from './routes/payments.js'
import { errorHandler } from './utils/errors.js'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/health', (req, res) => res.json({ ok: true, service: 'trustwork-api' }))
  app.use('/api/auth', authRouter)
  app.use('/api/users', usersRouter)
  app.use('/api/projects', projectsRouter)
  app.use('/api/applications', applicationsRouter)
  app.use('/api/payments', paymentsRouter)

  app.use(errorHandler)
  return app
}

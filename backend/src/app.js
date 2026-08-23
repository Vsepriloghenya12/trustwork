import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { projectsRouter } from './routes/projects.js'
import { applicationsRouter } from './routes/applications.js'
import { paymentsRouter } from './routes/payments.js'
import { supportRouter } from './routes/support.js'
import { statsRouter } from './routes/stats.js'
import { reviewsRouter } from './routes/reviews.js'
import { subscriptionsRouter } from './routes/subscriptions.js'
import { notificationsRouter } from './routes/notifications.js'
import { invitationsRouter } from './routes/invitations.js'
import { pricingRouter } from './routes/pricing.js'
import { arbitrationRouter } from './routes/arbitration.js'
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
  app.use('/api/support', supportRouter)
  app.use('/api/stats', statsRouter)
  app.use('/api/reviews', reviewsRouter)
  app.use('/api/subscriptions', subscriptionsRouter)
  app.use('/api/notifications', notificationsRouter)
  app.use('/api/invitations', invitationsRouter)
  app.use('/api/pricing', pricingRouter)
  app.use('/api/arbitration', arbitrationRouter)

  app.use(errorHandler)
  return app
}

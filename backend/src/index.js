import { createApp } from './app.js'
import { config } from './config.js'

createApp().listen(config.port, () => {
  console.log(`TrustWork API запущен на порту ${config.port}`)
})

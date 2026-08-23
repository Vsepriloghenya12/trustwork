import { createApp } from './app.js'
import { config } from './config.js'
import { startMaintenance } from './services/maintenance.js'

createApp().listen(config.port, () => {
  console.log(`TrustWork API запущен на порту ${config.port}`)
  // Сроки возвратов, напоминания и передача споров поддержке зависят от времени,
  // а не от действий пользователя — их двигает фоновая проверка раз в час
  startMaintenance()
})

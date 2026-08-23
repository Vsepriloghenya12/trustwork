// Service worker: установка на главный экран и push-уведомления.
// Оффлайн-кэширование добавим после стабилизации интерфейса.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: 'TrustWork' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'TrustWork', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      lang: 'ru',
      // tag не даёт одному событию показаться дважды
      tag: data.tag,
      data: { url: data.url || '/notifications' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/notifications'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Открыто окно приложения — переводим его на нужный экран, а не плодим вкладки
      for (const client of windows) {
        if ('focus' in client && 'navigate' in client) {
          return client.focus().then(() => client.navigate(url))
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})

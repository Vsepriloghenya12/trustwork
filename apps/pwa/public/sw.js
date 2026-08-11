// Минимальный service worker: достаточно для установки PWA на главный экран.
// Оффлайн-кэширование добавим после стабилизации интерфейса.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})

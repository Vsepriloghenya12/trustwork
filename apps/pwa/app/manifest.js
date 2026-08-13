export default function manifest() {
  return {
    name: 'TrustWork — фриланс с защитой оплаты',
    short_name: 'TrustWork',
    description: 'Проекты с замороженным бюджетом: отклики бесплатны, оплата гарантирована эскроу.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f6fb',
    theme_color: '#3b3486',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // maskable: Android обрезает иконку под маску устройства (круг, сквиркл)
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

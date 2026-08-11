import { Unbounded, Manrope } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import SwRegister from '@/components/SwRegister'

const display = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600'],
  variable: '--font-display',
})

const body = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
})

export const metadata = {
  title: 'TrustWork — фриланс с защитой оплаты',
  description:
    'Проекты с замороженным бюджетом: отклики бесплатны, оплата гарантирована эскроу.',
  appleWebApp: { capable: true, title: 'TrustWork', statusBarStyle: 'default' },
  icons: { apple: '/icons/icon-192.png' },
}

export const viewport = {
  themeColor: '#3b3486',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <body>
        {children}
        <BottomNav />
        <SwRegister />
      </body>
    </html>
  )
}

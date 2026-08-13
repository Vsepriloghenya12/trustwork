import { Unbounded, Manrope } from 'next/font/google'
import './globals.css'

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
  title: 'TrustWork — панель владельца',
  description: 'Обращения в поддержку и управление платформой',
  robots: { index: false, follow: false },
}

export const viewport = {
  themeColor: '#3b3486',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FeedIcon, ChatIcon, UserIcon } from './Icons'
import { api, getToken } from '@/lib/api'

// Поиск живет прямо в ленте, отдельная вкладка не нужна
const items = [
  { href: '/', label: 'Лента', icon: FeedIcon },
  { href: '/chats', label: 'Чаты', icon: ChatIcon },
  { href: '/profile', label: 'Профиль', icon: UserIcon },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!getToken()) return
    const tick = () =>
      api('/api/users/me/unread')
        .then((r) => setUnread(r.total))
        .catch(() => {})
    tick()
    const timer = setInterval(tick, 30000)
    return () => clearInterval(timer)
  }, [pathname])

  // На экранах входа и внутри чата навигация не нужна
  if (pathname === '/login' || /^\/chats\/.+/.test(pathname)) return null

  const activeIndex = items.findIndex(({ href }) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href),
  )

  return (
    <nav className="nav" aria-label="Основная навигация">
      {/* Подложка переезжает к выбранному разделу, а не мигает на месте */}
      {activeIndex >= 0 && (
        <span
          className="nav__indicator"
          aria-hidden
          style={{
            left: 8,
            width: `calc((100% - 16px) / ${items.length})`,
            transform: `translateX(calc(${activeIndex} * 100%))`,
          }}
        />
      )}
      {items.map(({ href, label, icon: Icon }, i) => (
        <Link
          key={href}
          href={href}
          className={`nav__item${i === activeIndex ? ' nav__item--active' : ''}`}
          aria-current={i === activeIndex ? 'page' : undefined}
        >
          <span className="nav__icon">
            <Icon />
            {href === '/chats' && unread > 0 && (
              <span className="nav__badge" aria-label={`Непрочитанных: ${unread}`}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  )
}

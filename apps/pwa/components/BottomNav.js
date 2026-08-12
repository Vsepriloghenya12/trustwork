'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FeedIcon, SearchIcon, ChatIcon, UserIcon } from './Icons'
import { api, getToken } from '@/lib/api'

const items = [
  { href: '/', label: 'Лента', icon: FeedIcon },
  { href: '/search', label: 'Поиск', icon: SearchIcon },
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
  return (
    <nav className="nav" aria-label="Основная навигация">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link key={href} href={href} className={`nav__item${active ? ' nav__item--active' : ''}`}>
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
        )
      })}
    </nav>
  )
}

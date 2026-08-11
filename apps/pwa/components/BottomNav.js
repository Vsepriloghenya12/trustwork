'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FeedIcon, SearchIcon, ChatIcon, UserIcon } from './Icons'

const items = [
  { href: '/', label: 'Лента', icon: FeedIcon },
  { href: '/search', label: 'Поиск', icon: SearchIcon },
  { href: '/chats', label: 'Чаты', icon: ChatIcon },
  { href: '/profile', label: 'Профиль', icon: UserIcon },
]

export default function BottomNav() {
  const pathname = usePathname()
  // На экранах входа и внутри чата навигация не нужна
  if (pathname === '/login' || /^\/chats\/.+/.test(pathname)) return null
  return (
    <nav className="nav" aria-label="Основная навигация">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link key={href} href={href} className={`nav__item${active ? ' nav__item--active' : ''}`}>
            <Icon />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

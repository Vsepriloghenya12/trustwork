'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { clearSession, getUser } from '@/lib/api'

export default function TopBar({ user }) {
  const router = useRouter()
  const current = user ?? getUser()

  function logout() {
    clearSession()
    router.replace('/login')
  }

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link href="/" className="brand">
          TrustWork
          <span className="brand__tag">Владелец</span>
        </Link>
        <nav className="row" style={{ gap: 4, marginLeft: 12 }}>
          <Link href="/" className="btn btn--quiet">
            Поддержка
          </Link>
          <Link href="/appeals" className="btn btn--quiet">
            Обжалования
          </Link>
          <Link href="/arbitration" className="btn btn--quiet">
            Разбирательства
          </Link>
        </nav>
        <div style={{ flex: 1 }} />
        {current && (
          <>
            <span className="caption">{current.name || current.phone}</span>
            <button className="btn btn--quiet" onClick={logout}>
              Выйти
            </button>
          </>
        )}
      </div>
    </header>
  )
}

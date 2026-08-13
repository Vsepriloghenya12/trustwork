'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import { api, getToken, getUser, formatDateTime } from '@/lib/api'

function initials(name) {
  return (name || '•')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function OwnerHomePage() {
  const router = useRouter()
  const [threads, setThreads] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken() || !getUser()?.isAdmin) {
      router.replace('/login')
      return
    }
    const load = () =>
      api('/api/support/threads')
        .then(setThreads)
        .catch((e) => setError(e.message))
    load()
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [router])

  const pending = threads?.reduce((sum, t) => sum + t.unanswered, 0) ?? 0

  return (
    <>
      <TopBar />
      <main className="page stack">
        <div>
          <h1 className="h1">Обращения в поддержку</h1>
          <p className="sub">
            {pending > 0
              ? `Без ответа: ${pending}`
              : threads?.length
                ? 'Все обращения обработаны'
                : 'Здесь появятся вопросы пользователей'}
          </p>
        </div>

        {error && <div className="error">{error}</div>}

        {threads?.length === 0 && (
          <div className="card empty">
            <h3>Обращений пока нет</h3>
            <p className="small">
              Пользователи пишут из приложения: Профиль → Прочее → Поддержка.
            </p>
          </div>
        )}

        {threads?.length > 0 && (
          <div className="card">
            {threads.map((t) => (
              <Link key={t.userId} href={`/support/${t.userId}`} className="thread-row">
                <span className="avatar">{initials(t.user?.name)}</span>
                <span className="thread-main">
                  <span className="row" style={{ gap: 8 }}>
                    <span className="thread-name">{t.user?.name || 'Без имени'}</span>
                    <span className="role-tag">
                      {t.user?.role === 'CLIENT' ? 'заказчик' : 'фрилансер'}
                    </span>
                    <span className="caption">{t.user?.phone}</span>
                  </span>
                  <span className="thread-preview" style={{ display: 'block' }}>
                    {t.lastMessage?.fromSupport ? 'Вы: ' : ''}
                    {t.lastMessage?.text}
                  </span>
                </span>
                {t.unanswered > 0 && <span className="badge">{t.unanswered}</span>}
                <span className="caption" style={{ whiteSpace: 'nowrap' }}>
                  {t.lastMessage && formatDateTime(t.lastMessage.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

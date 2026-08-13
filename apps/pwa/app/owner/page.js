'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import { BackIcon, ChevronIcon, ChatIcon } from '@/components/Icons'
import { api, getToken, getUser, formatDate } from '@/lib/api'

// Первая версия страницы владельца: обращения в поддержку.
// Арбитраж и статистика появятся здесь же — экран прорабатываем отдельно.
export default function OwnerPage() {
  const router = useRouter()
  const [threads, setThreads] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    if (!getUser()?.isAdmin) {
      setError('Страница доступна только владельцу платформы')
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
    <main className="shell stack">
      <div className="topbar" style={{ marginBottom: 0 }}>
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
      </div>

      <h1 className="title-xl">Страница владельца</h1>
      <p className="sub">
        Обращения в поддержку{pending > 0 ? ` · без ответа: ${pending}` : ''}
      </p>

      {error && <div className="form-error">{error}</div>}

      {threads?.length === 0 && (
        <div className="empty">
          <span className="empty__icon">
            <ChatIcon />
          </span>
          <h3>Обращений пока нет</h3>
          <p className="small">Здесь появятся вопросы пользователей из раздела «Поддержка».</p>
        </div>
      )}

      {threads?.length > 0 && (
        <div className="list" style={{ borderTop: '1px solid var(--c-line)' }}>
          {threads.map((t) => (
            <Link key={t.userId} href={`/owner/support/${t.userId}`} className="list-row">
              <Avatar name={t.user?.name} size={40} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="row" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>
                    {t.user?.name || 'Без имени'}
                  </span>
                  <span className="caption">
                    {t.user?.role === 'CLIENT' ? 'заказчик' : 'фрилансер'}
                  </span>
                </span>
                <span
                  className="caption"
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.lastMessage?.fromSupport ? 'Вы: ' : ''}
                  {t.lastMessage?.text}
                </span>
              </span>
              {t.unanswered > 0 && <span className="unread-pill">{t.unanswered}</span>}
              <span className="caption">{t.lastMessage && formatDate(t.lastMessage.createdAt)}</span>
              <span style={{ color: 'var(--c-faint)', display: 'inline-flex' }}>
                <ChevronIcon />
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}

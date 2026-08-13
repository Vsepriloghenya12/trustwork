'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BackIcon, ChatIcon } from '@/components/Icons'
import { api, getToken, formatDate } from '@/lib/api'

const STATUS = {
  PENDING: { label: 'Ждет ответа', className: 'status-pill' },
  ACCEPTED: { label: 'Вас выбрали', className: 'badge-escrow' },
  REJECTED: { label: 'Отклонен', className: 'chip' },
}

const TABS = [
  { key: 'PENDING', label: 'Ждут ответа' },
  { key: 'ACCEPTED', label: 'Приняты' },
  { key: 'REJECTED', label: 'Отклонены' },
]

export default function MyApplicationsPage() {
  const router = useRouter()
  const [applications, setApplications] = useState(null)
  const [tab, setTab] = useState('PENDING')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api('/api/applications/mine')
      .then(setApplications)
      .catch((e) => setError(e.message))
  }, [router])

  const visible = applications?.filter((a) => a.status === tab) ?? []

  return (
    <main className="shell stack">
      <div className="topbar" style={{ marginBottom: 0 }}>
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
      </div>

      <h1 className="title-xl">Мои отклики</h1>

      <div className="filters">
        {TABS.map((t) => {
          const count = applications?.filter((a) => a.status === t.key).length ?? 0
          return (
            <button
              key={t.key}
              className={`filter${tab === t.key ? ' filter--active' : ''}`}
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
            >
              {t.label} {count > 0 && <span className="caption">{count}</span>}
            </button>
          )
        })}
      </div>

      {error && <div className="form-error">{error}</div>}

      {applications && visible.length === 0 && (
        <div className="empty">
          <span className="empty__icon">
            <ChatIcon />
          </span>
          <h3>Здесь пусто</h3>
          <p className="small">
            {tab === 'PENDING'
              ? 'Откликайтесь на проекты из ленты — питчи появятся здесь.'
              : tab === 'ACCEPTED'
                ? 'Проекты, где вас выбрали исполнителем, будут здесь.'
                : 'Отклоненные отклики будут здесь.'}
          </p>
          {tab === 'PENDING' && (
            <Link href="/" className="btn btn--primary" style={{ marginTop: 16 }}>
              Смотреть проекты
            </Link>
          )}
        </div>
      )}

      {visible.length > 0 && (
        <div className="list">
          {visible.map((a) => (
            <Link key={a.id} href={`/projects/${a.project.id}`} className="project-row">
              <div className="row row--between">
                <span className={STATUS[a.status].className}>{STATUS[a.status].label}</span>
                <span className="caption">{formatDate(a.createdAt)}</span>
              </div>
              <div className="card__title">{a.project.title}</div>
              <p className="card__desc">{a.pitch}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}

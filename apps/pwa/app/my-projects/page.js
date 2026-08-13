'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { BackIcon, LockIcon, PlusIcon, FeedIcon } from '@/components/Icons'
import { api, getToken, getUser, formatMoney, formatDate } from '@/lib/api'

const STATUS_LABELS = {
  DRAFT: 'Черновик',
  PENDING_PAYMENT: 'Ожидает оплаты',
  OPEN: 'Открыт набор',
  FUNDED: 'Открыт набор',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершен',
  CANCELLED: 'Отменен',
}

const TABS = [
  { key: 'open', label: 'Открытые', statuses: ['DRAFT', 'PENDING_PAYMENT', 'OPEN', 'FUNDED'] },
  { key: 'work', label: 'В работе', statuses: ['IN_PROGRESS'] },
  { key: 'done', label: 'Завершенные', statuses: ['COMPLETED', 'CANCELLED'] },
]

export default function MyProjectsWrapper() {
  return (
    <Suspense>
      <MyProjectsPage />
    </Suspense>
  )
}

function MyProjectsPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [projects, setProjects] = useState(null)
  const [tab, setTab] = useState(params.get('tab') || 'open')
  const [error, setError] = useState('')
  const user = getUser()

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api('/api/projects/mine')
      .then(setProjects)
      .catch((e) => setError(e.message))
  }, [router])

  const active = TABS.find((t) => t.key === tab) ?? TABS[0]
  const visible = projects?.filter((p) => active.statuses.includes(p.status)) ?? []

  return (
    <main className="shell stack">
      <div className="topbar" style={{ marginBottom: 0 }}>
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
        {user?.role === 'CLIENT' && (
          <Link href="/projects/new" className="iconbtn" aria-label="Создать проект">
            <PlusIcon />
          </Link>
        )}
      </div>

      <h1 className="title-xl">{user?.role === 'CLIENT' ? 'Мои проекты' : 'Мои сделки'}</h1>

      <div className="filters">
        {TABS.map((t) => {
          const count = projects?.filter((p) => t.statuses.includes(p.status)).length ?? 0
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

      {projects && visible.length === 0 && (
        <div className="empty">
          <span className="empty__icon">
            <FeedIcon />
          </span>
          <h3>Здесь пусто</h3>
          <p className="small">
            {tab === 'open'
              ? 'Разместите проект — он появится в ленте, и фрилансеры смогут откликнуться.'
              : tab === 'work'
                ? 'Проекты появятся здесь, когда вы выберете исполнителя.'
                : 'Завершенные и отмененные проекты будут здесь.'}
          </p>
          {tab === 'open' && user?.role === 'CLIENT' && (
            <Link href="/projects/new" className="btn btn--primary" style={{ marginTop: 16 }}>
              Разместить проект
            </Link>
          )}
        </div>
      )}

      {visible.length > 0 && (
        <div className="list">
          {visible.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="project-row">
              <div className="row row--between">
                <span className="status-pill">{STATUS_LABELS[p.status]}</span>
                <span className="caption">{formatDate(p.createdAt)}</span>
              </div>
              <div className="card__title">{p.title}</div>
              <div className="row row--between">
                <span className="budget">{formatMoney(p.budget, p.currency)}</span>
                {p.escrowActive ? (
                  <span className="badge-escrow">
                    <LockIcon />
                    В эскроу
                  </span>
                ) : p.escrowReleased ? (
                  <span className="caption">выплачено</span>
                ) : (
                  <span className="caption">без эскроу</span>
                )}
              </div>
              {p.freelancer && (
                <span className="caption">Исполнитель: {p.freelancer.name || 'без имени'}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}

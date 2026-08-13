'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import { api, getToken, getUser, formatDateTime } from '@/lib/api'

const STATUS_LABELS = {
  PENDING: 'На рассмотрении',
  ACCEPTED: 'Удовлетворено — отзыв скрыт',
  REJECTED: 'Отклонено — отзыв остался',
}

const FILTERS = [
  { key: 'PENDING', label: 'Новые' },
  { key: 'ALL', label: 'Все' },
]

export default function AppealsPage() {
  const router = useRouter()
  const [appeals, setAppeals] = useState(null)
  const [filter, setFilter] = useState('PENDING')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api(`/api/reviews/appeals?status=${filter}`)
      .then(setAppeals)
      .catch((e) => setError(e.message))
  }, [filter])

  useEffect(() => {
    if (!getToken() || !getUser()?.isAdmin) {
      router.replace('/login')
      return
    }
    load()
  }, [load, router])

  async function resolve(appeal, decision) {
    const resolution = prompt(
      decision === 'ACCEPTED'
        ? 'Комментарий к решению (увидит заявитель). Отзыв будет скрыт.'
        : 'Причина отказа (увидит заявитель).',
      '',
    )
    if (resolution === null) return
    setBusyId(appeal.id)
    try {
      await api(`/api/reviews/appeals/${appeal.id}/resolve`, {
        method: 'POST',
        body: { decision, resolution },
      })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <TopBar />
      <main className="page stack">
        <div>
          <h1 className="h1">Обжалования отзывов</h1>
          <p className="sub">
            Заявитель просит скрыть отзыв о себе. Решение влияет на его рейтинг.
          </p>
        </div>

        <div className="row">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={f.key === filter ? 'btn' : 'btn btn--ghost'}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        {appeals?.length === 0 && (
          <div className="card empty">
            <h3>Обжалований нет</h3>
            <p className="small">Здесь появятся жалобы пользователей на отзывы о себе.</p>
          </div>
        )}

        {appeals?.map((a) => (
          <div key={a.id} className="card" style={{ padding: 18 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="thread-name">
                {a.appellant.name || 'Без имени'} · {a.appellant.phone}
              </span>
              <span className="caption">{formatDateTime(a.createdAt)}</span>
            </div>

            <div className="stack" style={{ gap: 6, marginBottom: 12 }}>
              <span className="caption">Оспариваемый отзыв · проект «{a.review.project.title}»</span>
              <div
                style={{
                  background: '#f7f7fb',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 14,
                }}
              >
                {a.review.rating && (
                  <div style={{ color: '#f5a623', fontWeight: 800, marginBottom: 4 }}>
                    {'★'.repeat(a.review.rating)}
                    <span className="caption" style={{ marginLeft: 8 }}>
                      от {a.review.author.name || 'пользователя'}
                    </span>
                  </div>
                )}
                {a.review.comment || <span className="muted">без комментария</span>}
              </div>
            </div>

            <div className="stack" style={{ gap: 6, marginBottom: 14 }}>
              <span className="caption">Довод заявителя</span>
              <div style={{ fontSize: 14.5 }}>{a.reason}</div>
            </div>

            {a.status === 'PENDING' ? (
              <div className="row">
                <button className="btn" disabled={busyId === a.id} onClick={() => resolve(a, 'ACCEPTED')}>
                  Скрыть отзыв
                </button>
                <button
                  className="btn btn--ghost"
                  disabled={busyId === a.id}
                  onClick={() => resolve(a, 'REJECTED')}
                >
                  Оставить отзыв
                </button>
              </div>
            ) : (
              <div className="stack" style={{ gap: 4 }}>
                <span className="role-tag">{STATUS_LABELS[a.status]}</span>
                {a.resolution && <span className="caption">Комментарий: {a.resolution}</span>}
              </div>
            )}
          </div>
        ))}
      </main>
    </>
  )
}

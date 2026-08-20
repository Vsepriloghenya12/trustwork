'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BackIcon, StarIcon } from '@/components/Icons'
import { api, getToken, formatDate } from '@/lib/api'
import { withPlural } from '@/lib/text'

const APPEAL_LABELS = {
  PENDING: 'Обжалование на рассмотрении',
  ACCEPTED: 'Обжалование удовлетворено',
  REJECTED: 'Обжалование отклонено',
}

export default function MyReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState(null)
  const [error, setError] = useState('')
  const [appealFor, setAppealFor] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [appealError, setAppealError] = useState('')

  const load = useCallback(() => {
    api('/api/reviews/mine')
      .then(setReviews)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    load()
  }, [load, router])

  async function sendAppeal(e) {
    e.preventDefault()
    setBusy(true)
    setAppealError('')
    try {
      await api(`/api/reviews/${appealFor.id}/appeal`, { method: 'POST', body: { reason } })
      setAppealFor(null)
      setReason('')
      load()
    } catch (e) {
      setAppealError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const dealReviews = reviews?.filter((r) => r.rating) ?? []
  const average = dealReviews.length
    ? (dealReviews.reduce((sum, r) => sum + r.rating, 0) / dealReviews.length).toFixed(1)
    : null

  return (
    <main className="shell stack">
      <div className="topbar" style={{ marginBottom: 0 }}>
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
      </div>

      <h1 className="title-xl">Отзывы обо мне</h1>
      <p className="sub">
        {average
          ? `Средняя оценка ${average} · ${withPlural(dealReviews.length, 'оценка', 'оценки', 'оценок')} за сделки`
          : 'Оценки ставят участники завершенных сделок'}
      </p>

      {error && <div className="form-error">{error}</div>}

      {reviews?.length === 0 && (
        <div className="empty">
          <h3>Отзывов пока нет</h3>
          <p className="small">
            Они появятся после первых сделок: оценку ставит вторая сторона, когда работа завершена.
          </p>
        </div>
      )}

      {reviews?.length > 0 && (
        <div className="list" style={{ borderTop: '1px solid var(--c-line)' }}>
          {reviews.map((r) => (
            <div key={r.id} className="thread" style={{ gap: 8 }}>
              <div className="row row--between">
                <span className="small" style={{ fontWeight: 700 }}>
                  {r.author?.name || 'Пользователь'}
                </span>
                <span className="caption">{formatDate(r.createdAt)}</span>
              </div>

              {r.rating ? (
                <span className="row" style={{ gap: 2, color: 'var(--c-amber)' }}>
                  {Array.from({ length: r.rating }, (_, i) => (
                    <StarIcon key={i} size={15} />
                  ))}
                </span>
              ) : (
                <span className="caption">отзыв после диалога · в рейтинг не входит</span>
              )}

              {r.comment && <p className="small">{r.comment}</p>}

              {r.project && (
                <Link href={`/projects/${r.project.id}`} className="caption" style={{ color: 'var(--c-primary)' }}>
                  Проект: {r.project.title}
                </Link>
              )}

              {r.appeal ? (
                <span className="status-pill">{APPEAL_LABELS[r.appeal.status]}</span>
              ) : (
                <button
                  className="btn btn--ghost btn--compact"
                  onClick={() => {
                    setAppealFor(r)
                    setAppealError('')
                  }}
                >
                  Обжаловать отзыв
                </button>
              )}
              {r.appeal?.resolution && <p className="caption">Ответ поддержки: {r.appeal.resolution}</p>}
            </div>
          ))}
        </div>
      )}

      {appealFor && (
        <div className="sheet-backdrop" onClick={() => setAppealFor(null)}>
          <form className="sheet stack" onClick={(e) => e.stopPropagation()} onSubmit={sendAppeal}>
            {/* Ручка: видно, что панель можно потянуть вниз */}
            <span className="sheet__handle" aria-hidden />
            <div className="title-lg">Обжаловать отзыв</div>
            <p className="small muted">
              Опишите, почему оценка несправедлива. Поддержка изучит переписку и файлы по проекту:
              если отзыв нарушает правила, он будет скрыт и перестанет влиять на рейтинг.
            </p>
            <textarea
              className="input"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: работа сдана в срок, замечаний в чате не было…"
              autoFocus
            />
            {appealError && <div className="form-error">{appealError}</div>}
            <button className="btn btn--primary" disabled={busy || reason.trim().length < 10}>
              Отправить на рассмотрение
            </button>
          </form>
        </div>
      )}
    </main>
  )
}

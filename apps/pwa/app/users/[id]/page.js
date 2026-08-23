'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import Portfolio from '@/components/Portfolio'
import { BackIcon, StarIcon, CheckIcon, VerifiedIcon } from '@/components/Icons'
import PayoutBadge from '@/components/PayoutBadge'
import { api, formatDate } from '@/lib/api'
import { plural } from '@/lib/text'

export default function PublicProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [reviews, setReviews] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/api/users/${id}`)
      .then(setUser)
      .catch((e) => setError(e.message))
    api(`/api/users/${id}/reviews`)
      .then(setReviews)
      .catch(() => {})
  }, [id])

  if (error) {
    return (
      <main className="shell stack">
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
        <div className="form-error">{error}</div>
      </main>
    )
  }
  if (!user) {
    return (
      <main className="shell stack">
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
        <div className="muted small">Загружаем профиль…</div>
      </main>
    )
  }

  return (
    <main className="shell stack" style={{ gap: 16 }}>
      <div className="topbar" style={{ marginBottom: 0 }}>
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
      </div>

      <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 10 }}>
        <Avatar name={user.name} src={user.avatarUrl} size={72} />
        <div>
          <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 19 }}>{user.name || 'Без имени'}</span>
            {user.isVerified && (
              <span style={{ color: 'var(--c-primary)', display: 'inline-flex' }}>
                <VerifiedIcon />
              </span>
            )}
          </div>
          <div className="sub">{user.role === 'CLIENT' ? 'Заказчик' : 'Фрилансер'} · на платформе с {formatDate(user.createdAt)}</div>
        </div>
        <div className="chips" style={{ justifyContent: 'center' }}>
          <span className="badge-escrow">
            <CheckIcon size={12} />
            Телефон подтвержден
          </span>
          {user.isVerified && (
            <span className="badge-escrow">
              <VerifiedIcon size={13} />
              Проверенный фрилансер
            </span>
          )}
          {user.role === 'FREELANCER' && <PayoutBadge status={user.payoutStatus} />}
          {user.social && (
            <a
              className="chip"
              href={user.social.startsWith('http') ? user.social : `https://${user.social}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Соцсеть
            </a>
          )}
        </div>
      </div>

      <div className="stats-row">
        <div className="stats-cell">
          <div className="num">
            {user.role === 'CLIENT' ? (user.postedProjects ?? 0) : user.completedDeals}
          </div>
          <div className="caption">
            {user.role === 'CLIENT'
              ? plural(user.postedProjects ?? 0, 'проект размещен', 'проекта размещено', 'проектов размещено')
              : plural(user.completedDeals, 'сделка с эскроу', 'сделки с эскроу', 'сделок с эскроу')}
          </div>
        </div>
        <div className="stats-cell">
          <div className="num">{user.rating > 0 ? user.rating.toFixed(1) : '—'}</div>
          <div className="caption">рейтинг</div>
        </div>
        <div className="stats-cell">
          <div className="num">{user.reviewsCount}</div>
          <div className="caption">
            {plural(user.reviewsCount, 'оценка за сделку', 'оценки за сделки', 'оценок за сделки')}
          </div>
        </div>
      </div>

      {user.skills?.length > 0 && (
        <section className="stack" style={{ gap: 8 }}>
          <div className="h-sec">Навыки</div>
          <div className="chips">
            {user.skills.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {user.bio && (
        <section className="stack" style={{ gap: 6 }}>
          <div className="h-sec">{user.role === 'CLIENT' ? 'О компании' : 'О себе'}</div>
          <p className="small">{user.bio}</p>
        </section>
      )}

      <Portfolio userId={user.id} />

      {reviews?.reviews.length > 0 && (
        <section className="stack" style={{ gap: 0 }}>
          <div className="h-sec">Отзывы</div>
          {reviews.reviews.map((r) => (
            <div key={r.id} className="thread" style={{ gap: 6 }}>
              <div className="row row--between">
                <span className="small" style={{ fontWeight: 700 }}>{r.author.name || 'Пользователь'}</span>
                <span className="caption">{formatDate(r.createdAt)}</span>
              </div>
              {r.rating ? (
                <span className="row" style={{ gap: 2, color: 'var(--c-amber)' }}>
                  {Array.from({ length: r.rating }, (_, i) => (
                    <StarIcon key={i} size={14} />
                  ))}
                </span>
              ) : (
                <span className="caption">после диалога</span>
              )}
              {r.comment && <p className="small muted">{r.comment}</p>}
            </div>
          ))}
        </section>
      )}
    </main>
  )
}

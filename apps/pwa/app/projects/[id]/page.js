'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import EscrowTimeline from '@/components/EscrowTimeline'
import {
  BackIcon,
  LockIcon,
  StarIcon,
  VerifiedIcon,
  CalendarIcon,
  ChatIcon,
} from '@/components/Icons'
import { api, getUser, formatMoney, formatDate } from '@/lib/api'

const STATUS_LABELS = {
  DRAFT: 'Черновик',
  PENDING_PAYMENT: 'Ожидает оплаты',
  OPEN: 'Открыт набор',
  FUNDED: 'Открыт набор',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершен',
  CANCELLED: 'Отменен',
}

// Должен совпадать со списком REVIEW_TAGS на сервере
const REVIEW_TAGS = [
  'не отвечает',
  'просит бесплатное тестовое',
  'уводит в мессенджер',
  'вежливое общение',
  'конкретное ТЗ',
  'быстро отвечает',
]

const APPLIABLE = ['OPEN', 'FUNDED']

export default function ProjectPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [applications, setApplications] = useState(null)
  const [clientReviews, setClientReviews] = useState(null)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pitchOpen, setPitchOpen] = useState(false)
  const [pitch, setPitch] = useState('')
  const [pitchSent, setPitchSent] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewTags, setReviewTags] = useState([])
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewDone, setReviewDone] = useState(false)

  const load = useCallback(() => {
    api(`/api/projects/${id}`)
      .then(setProject)
      .catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    setUser(getUser())
    load()
  }, [load])

  const isOwner = user && project && user.id === project.client.id
  const isAssignee = user && project && project.freelancer?.id === user.id

  useEffect(() => {
    if (isOwner && ['OPEN', 'FUNDED', 'IN_PROGRESS'].includes(project?.status)) {
      api(`/api/projects/${id}/applications`).then(setApplications).catch(() => {})
    }
  }, [isOwner, project?.status, id])

  useEffect(() => {
    if (project?.client?.id) {
      api(`/api/users/${project.client.id}/reviews`)
        .then((r) => setClientReviews(r.summary))
        .catch(() => {})
    }
  }, [project?.client?.id])

  async function act(fn) {
    setBusy(true)
    setActionError('')
    try {
      await fn()
      load()
    } catch (e) {
      setActionError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const publish = () => act(() => api(`/api/projects/${id}/publish`, { method: 'POST' }))
  const fund = () => act(() => api(`/api/projects/${id}/fund`, { method: 'POST' }))
  const complete = () => act(() => api(`/api/projects/${id}/complete`, { method: 'POST' }))
  const cancel = () => {
    if (!confirm('Отменить проект? Если бюджет был заморожен — он вернется вам.')) return
    act(() => api(`/api/projects/${id}/cancel`, { method: 'POST' }))
  }
  const accept = (appId) =>
    act(async () => {
      await api(`/api/applications/${appId}/accept`, { method: 'POST' })
    })

  async function sendPitch(e) {
    e.preventDefault()
    setBusy(true)
    setActionError('')
    try {
      await api(`/api/projects/${id}/applications`, { method: 'POST', body: { pitch } })
      setPitchOpen(false)
      setPitchSent(true)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const isDealReview = project?.status === 'COMPLETED' && isAssignee

  async function sendReview(e) {
    e.preventDefault()
    setBusy(true)
    setActionError('')
    try {
      await api(`/api/projects/${id}/reviews`, {
        method: 'POST',
        body: {
          ...(isDealReview ? { rating: reviewRating } : {}),
          tags: reviewTags,
          ...(reviewComment.trim() ? { comment: reviewComment.trim() } : {}),
        },
      })
      setReviewOpen(false)
      setReviewDone(true)
      api(`/api/users/${project.client.id}/reviews`)
        .then((r) => setClientReviews(r.summary))
        .catch(() => {})
    } catch (e) {
      setActionError(e.message)
    } finally {
      setBusy(false)
    }
  }

  function toggleReviewTag(tag) {
    setReviewTags((tags) =>
      tags.includes(tag) ? tags.filter((t) => t !== tag) : tags.length < 3 ? [...tags, tag] : tags,
    )
  }

  if (error) {
    return (
      <main className="shell stack">
        <TopRow onBack={() => router.back()} />
        <div className="form-error">{error}</div>
      </main>
    )
  }
  if (!project) {
    return (
      <main className="shell stack">
        <TopRow onBack={() => router.back()} />
        <div className="muted small">Загружаем проект…</div>
      </main>
    )
  }

  const topTags = clientReviews
    ? Object.entries(clientReviews.tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : []

  return (
    <main className="shell stack">
      <TopRow onBack={() => router.back()} status={STATUS_LABELS[project.status]} />

      <h1 className="title-xl">{project.title}</h1>

      <div className="stack" style={{ gap: 10, paddingBottom: 2 }}>
        <div className="row" style={{ gap: 10 }}>
          <Avatar name={project.client.name} size={44} />
          <div style={{ flex: 1 }}>
            <div className="row" style={{ gap: 5 }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>
                {project.client.name || 'Заказчик'}
              </span>
              {project.client.isVerified && (
                <span style={{ color: 'var(--c-primary)', display: 'inline-flex' }}>
                  <VerifiedIcon />
                </span>
              )}
            </div>
            <div className="small muted row" style={{ gap: 4 }}>
              {project.client.reviewsCount > 0 ? (
                <>
                  <span style={{ color: '#f5a623', display: 'inline-flex' }}>
                    <StarIcon size={12} />
                  </span>
                  {project.client.rating.toFixed(1)} · {project.client.reviewsCount} оценок сделок
                </>
              ) : (
                'Без оценок за сделки'
              )}
            </div>
          </div>
          {user && !isOwner && !reviewDone && (
            <button className="btn btn--ghost btn--compact" onClick={() => setReviewOpen(true)}>
              Оценить
            </button>
          )}
          {reviewDone && <span className="status-pill">Отзыв учтен</span>}
        </div>
        {topTags.length > 0 && (
          <div className="chips">
            {topTags.map(([tag, count]) => (
              <span key={tag} className="chip">
                {tag} ×{count}
              </span>
            ))}
          </div>
        )}
        {clientReviews && (clientReviews.dialogCount > 0 || clientReviews.dealCount > 0) && (
          <div className="small muted">
            Отзывы фрилансеров: {clientReviews.dealCount} за сделки, {clientReviews.dialogCount} после
            диалогов
          </div>
        )}
      </div>

      {project.escrowActive || project.escrowReleased ? (
        <div className="escrow-panel">
          <div className="escrow-panel__title">
            <LockIcon size={16} />
            Безопасная сделка: {formatMoney(project.budget, project.currency)}{' '}
            {project.escrowReleased ? 'выплачено исполнителю' : 'заморожено в эскроу'}
          </div>
          <EscrowTimeline status={project.status === 'OPEN' ? 'FUNDED' : project.status} />
        </div>
      ) : (
        project.status !== 'DRAFT' && (
          <div className="notice">
            {project.status === 'COMPLETED'
              ? 'Сделка завершена. Оплата проходила напрямую, без эскроу.'
              : 'Бюджет не заморожен — оплата напрямую по договоренности. Эскроу подключает заказчик: тогда платформа гарантирует оплату.'}
          </div>
        )
      )}

      <div className="chips">
        <span className="chip">
          Бюджет: <b>{formatMoney(project.budget, project.currency)}</b>
        </span>
        {project.deadline && (
          <span className="chip">
            <CalendarIcon />
            до {formatDate(project.deadline)}
          </span>
        )}
        {project.tags.map((tag) => (
          <span key={tag} className="chip">
            {tag}
          </span>
        ))}
      </div>

      <section className="section">
        <div className="h-sec">Описание задачи</div>
        <p style={{ whiteSpace: 'pre-wrap', fontSize: 14.5 }}>{project.description}</p>
      </section>

      {actionError && !pitchOpen && !reviewOpen && <div className="form-error">{actionError}</div>}

      {/* ---- Действия по ролям ---- */}

      {!user && APPLIABLE.includes(project.status) && (
        <Link href="/login" className="btn btn--primary">
          Войти, чтобы предложить себя
        </Link>
      )}

      {user && !isOwner && APPLIABLE.includes(project.status) && !pitchSent && !isAssignee && (
        <button className="btn btn--primary" onClick={() => setPitchOpen(true)}>
          Предложить себя
        </button>
      )}
      {pitchSent && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <span className="status-pill">Питч отправлен — заказчик видит ваш отклик</span>
        </div>
      )}

      {isAssignee && ['IN_PROGRESS', 'COMPLETED'].includes(project.status) && (
        <Link href={`/chats/${project.id}`} className="btn btn--primary">
          <ChatIcon size={18} />
          Открыть чат сделки
        </Link>
      )}

      {isOwner && ['DRAFT', 'PENDING_PAYMENT'].includes(project.status) && (
        <>
          <button className="btn btn--green" onClick={fund} disabled={busy}>
            <LockIcon size={16} />
            Опубликовать с эскроу — {formatMoney(project.budget, project.currency)}
          </button>
          <button className="btn btn--ghost" onClick={publish} disabled={busy}>
            Опубликовать без эскроу
          </button>
          <p className="small muted" style={{ textAlign: 'center' }}>
            С эскроу проект получает бейдж «Оплата гарантирована» и показывается выше в ленте.
            Публикация без эскроу бесплатна, заморозить бюджет можно позже.
          </p>
        </>
      )}

      {isOwner && APPLIABLE.includes(project.status) && (
        <section className="stack">
          {project.status === 'OPEN' && (
            <button className="btn btn--green" onClick={fund} disabled={busy}>
              <LockIcon size={16} />
              Подключить эскроу — бейдж «Оплата гарантирована»
            </button>
          )}
          <div className="section" style={{ gap: 0 }}>
            <div className="h-sec">
              Отклики {applications ? <b>· {applications.length}</b> : ''}
            </div>
          </div>
          {applications?.length === 0 && (
            <div className="notice">Пока нет откликов. Фрилансеры уже видят проект в ленте.</div>
          )}
          {applications?.map((a) => (
            <div key={a.id} className="thread">
              <div className="row">
                <Avatar name={a.freelancer.name} size={34} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>
                    {a.freelancer.name || 'Фрилансер'}
                  </span>
                  <div className="small muted">
                    {a.freelancer.completedDeals} сделок
                    {a.freelancer.isVerified ? ' · Проверенный' : ' · Новичок'}
                  </div>
                </div>
              </div>
              <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{a.pitch}</p>
              <div className="row">
                <button
                  className="btn btn--primary btn--compact"
                  onClick={() => accept(a.id)}
                  disabled={busy}
                >
                  Выбрать исполнителем
                </button>
                <Link
                  href={`/chats/${project.id}?with=${a.freelancer.id}`}
                  className="btn btn--ghost btn--compact"
                >
                  Написать
                </Link>
              </div>
            </div>
          ))}
          <button className="btn btn--outline-danger" onClick={cancel} disabled={busy}>
            Отменить проект
          </button>
        </section>
      )}

      {isOwner && project.status === 'IN_PROGRESS' && (
        <>
          <Link href={`/chats/${project.id}`} className="btn btn--ghost">
            <ChatIcon size={18} />
            Чат с исполнителем
          </Link>
          <button className="btn btn--green" onClick={complete} disabled={busy}>
            {project.escrowActive ? 'Принять работу и оплатить' : 'Принять работу'}
          </button>
          <p className="small muted" style={{ textAlign: 'center' }}>
            {project.escrowActive
              ? 'Деньги уйдут исполнителю сразу после подтверждения.'
              : 'Эскроу не подключен — оплату вы проводите напрямую.'}
          </p>
        </>
      )}

      {project.status === 'COMPLETED' && (
        <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
          <span className="badge-escrow">
            {project.escrowReleased ? 'Сделка завершена · оплата выплачена' : 'Сделка завершена'}
          </span>
        </div>
      )}

      {/* ---- Шторка питча ---- */}
      {pitchOpen && (
        <div className="sheet-backdrop" onClick={() => setPitchOpen(false)}>
          <form className="sheet stack" onClick={(e) => e.stopPropagation()} onSubmit={sendPitch}>
            <div className="title-lg">Предложить себя</div>
            <p className="small muted">
              Короткий питч работает лучше шаблона: чем поможете и почему именно вы.
            </p>
            <textarea
              className="input"
              rows={5}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Здравствуйте! Сделаю за 5 дней, вот похожий кейс…"
              autoFocus
            />
            {actionError && <div className="form-error">{actionError}</div>}
            <button className="btn btn--primary" disabled={busy || pitch.trim().length < 10}>
              Отправить питч
            </button>
          </form>
        </div>
      )}

      {/* ---- Шторка оценки заказчика ---- */}
      {reviewOpen && (
        <div className="sheet-backdrop" onClick={() => setReviewOpen(false)}>
          <form className="sheet stack" onClick={(e) => e.stopPropagation()} onSubmit={sendReview}>
            <div className="title-lg">Оценить заказчика</div>
            {isDealReview ? (
              <>
                <p className="small muted">Сделка завершена — ваша оценка попадет в рейтинг.</p>
                <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewRating(n)}
                      aria-label={`Оценка ${n}`}
                      style={{
                        color: n <= reviewRating ? '#f5a623' : 'var(--c-line)',
                        display: 'inline-flex',
                        padding: 4,
                      }}
                    >
                      <StarIcon size={30} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="small muted">
                Отметьте факты о общении (до 3). Звезды станут доступны после завершенной сделки.
              </p>
            )}
            <div className="chips">
              {REVIEW_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`chip${reviewTags.includes(tag) ? ' chip--active' : ''}`}
                  onClick={() => toggleReviewTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea
              className="input"
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Комментарий (необязательно)"
            />
            {actionError && <div className="form-error">{actionError}</div>}
            <button
              className="btn btn--primary"
              disabled={busy || (isDealReview ? reviewRating === 0 : reviewTags.length === 0)}
            >
              Отправить отзыв
            </button>
          </form>
        </div>
      )}
    </main>
  )
}

function TopRow({ onBack, status }) {
  return (
    <div className="topbar" style={{ marginBottom: 4 }}>
      <button className="iconbtn" onClick={onBack} aria-label="Назад">
        <BackIcon />
      </button>
      {status && <span className="status-pill">{status}</span>}
    </div>
  )
}

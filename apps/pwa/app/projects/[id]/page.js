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
  FUNDED: 'Открыт набор',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершен',
  CANCELLED: 'Отменен',
}

export default function ProjectPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [applications, setApplications] = useState(null)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pitchOpen, setPitchOpen] = useState(false)
  const [pitch, setPitch] = useState('')
  const [pitchSent, setPitchSent] = useState(false)

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
    if (isOwner && ['FUNDED', 'IN_PROGRESS'].includes(project?.status)) {
      api(`/api/projects/${id}/applications`).then(setApplications).catch(() => {})
    }
  }, [isOwner, project?.status, id])

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

  const fund = () => act(() => api(`/api/projects/${id}/fund`, { method: 'POST' }))
  const complete = () => act(() => api(`/api/projects/${id}/complete`, { method: 'POST' }))
  const cancel = () => {
    if (!confirm('Отменить проект? Замороженные средства вернутся вам.')) return
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

  return (
    <main className="shell stack">
      <TopRow onBack={() => router.back()} status={STATUS_LABELS[project.status]} />

      <h1 className="page-title" style={{ fontSize: 21 }}>{project.title}</h1>

      <div className="card row" style={{ gap: 10 }}>
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
                {project.client.rating.toFixed(1)} · {project.client.reviewsCount} отзывов
              </>
            ) : (
              'Новый заказчик'
            )}
          </div>
        </div>
      </div>

      {project.escrowActive || project.status === 'COMPLETED' ? (
        <div className="escrow-panel">
          <div className="escrow-panel__title">
            <LockIcon size={16} />
            Безопасная сделка: {formatMoney(project.budget, project.currency)}{' '}
            {project.status === 'COMPLETED' ? 'выплачено исполнителю' : 'заморожено в эскроу'}
          </div>
          <EscrowTimeline status={project.status} />
        </div>
      ) : (
        <div className="card small muted">
          Бюджет еще не заморожен — проект не виден фрилансерам.
        </div>
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

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          Описание задачи
        </div>
        <p style={{ whiteSpace: 'pre-wrap', fontSize: 14.5 }}>{project.description}</p>
      </div>

      {actionError && <div className="form-error">{actionError}</div>}

      {/* ---- Действия по ролям ---- */}

      {!user && (
        <Link href="/login" className="btn btn--primary">
          Войти, чтобы предложить себя
        </Link>
      )}

      {user && !isOwner && project.status === 'FUNDED' && !pitchSent && !isAssignee && (
        <button className="btn btn--primary" onClick={() => setPitchOpen(true)}>
          Предложить себя
        </button>
      )}
      {pitchSent && (
        <div className="card row" style={{ justifyContent: 'center' }}>
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
            Заморозить {formatMoney(project.budget, project.currency)} в эскроу
          </button>
          <p className="small muted" style={{ textAlign: 'center' }}>
            После заморозки проект попадет в ленту с бейджем «Оплата гарантирована».
          </p>
        </>
      )}

      {isOwner && project.status === 'FUNDED' && (
        <section className="stack">
          <div className="eyebrow">Отклики {applications ? `· ${applications.length}` : ''}</div>
          {applications?.length === 0 && (
            <div className="card small muted">
              Пока нет откликов. Фрилансеры уже видят проект в ленте.
            </div>
          )}
          {applications?.map((a) => (
            <div key={a.id} className="card stack" style={{ gap: 10 }}>
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
            Отменить проект и вернуть деньги
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
            Принять работу и оплатить
          </button>
          <p className="small muted" style={{ textAlign: 'center' }}>
            Деньги уйдут исполнителю сразу после подтверждения.
          </p>
        </>
      )}

      {project.status === 'COMPLETED' && (
        <div className="card row" style={{ justifyContent: 'center', gap: 6 }}>
          <span className="badge-escrow">Сделка завершена · оплата выплачена</span>
        </div>
      )}

      {/* ---- Шторка питча ---- */}
      {pitchOpen && (
        <div className="sheet-backdrop" onClick={() => setPitchOpen(false)}>
          <form className="sheet stack" onClick={(e) => e.stopPropagation()} onSubmit={sendPitch}>
            <div className="page-title">Предложить себя</div>
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

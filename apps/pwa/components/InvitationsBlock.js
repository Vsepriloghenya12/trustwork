'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Avatar from './Avatar'
import { StarIcon, LockIcon } from './Icons'
import { api, getToken, formatMoney, formatDate } from '@/lib/api'

// Приглашения — самое ценное событие для фрилансера: заказчик выбрал его сам.
// Поэтому они живут наверху ленты, а не только в уведомлениях.
export default function InvitationsBlock({ onChanged }) {
  const [items, setItems] = useState([])
  const [accepting, setAccepting] = useState(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!getToken()) return
    api('/api/invitations/mine')
      .then(setItems)
      .catch(() => {})
  }, [])

  useEffect(load, [load])

  async function accept(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api(`/api/invitations/${accepting.id}/accept`, {
        method: 'POST',
        body: comment.trim() ? { comment: comment.trim() } : {},
      })
      setAccepting(null)
      setComment('')
      load()
      onChanged?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function decline(invitation) {
    await api(`/api/invitations/${invitation.id}/decline`, { method: 'POST' }).catch(() => {})
    load()
  }

  if (items.length === 0) return null

  return (
    <section className="stack" style={{ gap: 6 }}>
      <div className="h-sec">
        Вас пригласили <b>· {items.length}</b>
      </div>

      {items.map((invitation) => {
        const project = invitation.project
        return (
          <article key={invitation.id} className="invite">
            <Link href={`/projects/${project.id}`} className="row" style={{ gap: 10 }}>
              <Avatar name={project.client?.name} src={project.client?.avatarUrl} size={34} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="file-name" style={{ display: 'block' }}>
                  {project.title}
                </span>
                <span className="caption row" style={{ gap: 5, flexWrap: 'wrap' }}>
                  <span>{formatMoney(project.budget, project.currency)}</span>
                  <span aria-hidden>·</span>
                  {project.escrowActive ? (
                    <span className="row" style={{ gap: 3, color: 'var(--c-green-ink)', fontWeight: 700 }}>
                      <LockIcon size={11} />
                      эскроу
                    </span>
                  ) : (
                    <span>без эскроу</span>
                  )}
                  <span aria-hidden>·</span>
                  <span>до {formatDate(invitation.expiresAt)}</span>
                </span>
              </span>
            </Link>

            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn--primary btn--compact"
                onClick={() => {
                  setAccepting(invitation)
                  setError('')
                }}
              >
                <StarIcon size={14} />
                Откликнуться
              </button>
              <button className="btn btn--ghost btn--compact" onClick={() => decline(invitation)}>
                Отклонить
              </button>
            </div>
          </article>
        )
      })}

      {accepting && (
        <div className="sheet-backdrop" onClick={() => setAccepting(null)}>
          <form className="sheet stack" onClick={(e) => e.stopPropagation()} onSubmit={accept}>
            <span className="sheet__handle" aria-hidden />
            <div className="title-lg">Откликнуться на приглашение</div>
            <p className="small muted">
              Заказчик уже выбрал вас — питч писать не нужно. Если хотите, добавьте пару слов о
              сроках.
            </p>
            <textarea
              className="input"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Когда сможете взяться, пара слов (необязательно)"
            />
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn--primary" disabled={busy}>
              {busy ? 'Отправляем…' : 'Отправить отклик'}
            </button>
          </form>
        </div>
      )}
    </section>
  )
}

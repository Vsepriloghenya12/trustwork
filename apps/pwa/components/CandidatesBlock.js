'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Avatar from './Avatar'
import { StarIcon, VerifiedIcon, ChevronIcon } from './Icons'
import { api } from '@/lib/api'
import { plural } from '@/lib/text'

const STATUS_LABELS = {
  SENT: 'Приглашение отправлено',
  VIEWED: 'Приглашение просмотрено',
  ACCEPTED: 'Откликнулся',
  DECLINED: 'Отклонил приглашение',
  EXPIRED: 'Приглашение истекло',
}

// Карточка исполнителя одинаково выглядит и в блоке, и на полном экране
export function CandidateRow({ candidate, invitation, onInvite, busy }) {
  return (
    <div className="thread" style={{ gap: 9 }}>
      <Link href={`/users/${candidate.id}`} className="row" style={{ gap: 10 }}>
        <Avatar name={candidate.name} src={candidate.avatarUrl} size={40} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="row" style={{ gap: 5 }}>
            <span style={{ fontWeight: 800, fontSize: 14.5 }}>{candidate.name || 'Фрилансер'}</span>
            {candidate.isVerified && (
              <span style={{ color: 'var(--c-primary)', display: 'inline-flex' }}>
                <VerifiedIcon size={13} />
              </span>
            )}
          </span>
          <span className="caption row" style={{ gap: 5 }}>
            {candidate.reviewsCount > 0 ? (
              <>
                <span style={{ color: 'var(--c-amber)', display: 'inline-flex' }}>
                  <StarIcon size={11} />
                </span>
                {candidate.rating.toFixed(1)} ·{' '}
                {plural(candidate.completedDeals, 'сделка', 'сделки', 'сделок')}
              </>
            ) : (
              'Новичок — сделок пока нет'
            )}
          </span>
        </span>
      </Link>

      {candidate.matchedSkills?.length > 0 && (
        <div className="chips">
          {candidate.matchedSkills.map((skill) => (
            <span key={skill} className="chip chip--match">
              {skill}
            </span>
          ))}
        </div>
      )}

      {invitation ? (
        <span className="status-pill">{STATUS_LABELS[invitation.status]}</span>
      ) : (
        <button
          className="btn btn--ghost btn--compact"
          onClick={() => onInvite(candidate)}
          disabled={busy}
        >
          Пригласить в проект
        </button>
      )}
    </div>
  )
}

export default function CandidatesBlock({ projectId }) {
  const [data, setData] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    Promise.all([
      api(`/api/projects/${projectId}/candidates?take=5`),
      api(`/api/projects/${projectId}/invitations`).catch(() => []),
    ])
      .then(([candidates, invites]) => {
        setData(candidates)
        setInvitations(invites)
      })
      .catch(() => setData({ total: 0, items: [] }))
  }, [projectId])

  useEffect(load, [load])

  async function invite(candidate) {
    setBusy(true)
    setError('')
    try {
      await api(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        body: { freelancerId: candidate.id },
      })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // Некого предложить — блока нет вовсе, пустая заглушка только пугает
  if (!data || data.items.length === 0) return null

  const invitedIds = new Map(invitations.map((i) => [i.freelancer.id, i]))

  return (
    <section className="section">
      <div className="h-sec">
        Кому подойдёт эта задача <b>· {data.total}</b>
      </div>
      <p className="caption">Совпали навыки с тегами проекта. Можно позвать, не дожидаясь отклика.</p>

      {data.items.map((candidate) => (
        <CandidateRow
          key={candidate.id}
          candidate={candidate}
          invitation={invitedIds.get(candidate.id)}
          onInvite={invite}
          busy={busy}
        />
      ))}

      {error && <div className="form-error">{error}</div>}

      {data.total > data.items.length && (
        <Link href={`/projects/${projectId}/candidates`} className="btn btn--ghost">
          Показать всех ({data.total})
          <ChevronIcon size={16} />
        </Link>
      )}
    </section>
  )
}

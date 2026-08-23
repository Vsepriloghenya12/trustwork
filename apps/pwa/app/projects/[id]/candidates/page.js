'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CandidateRow } from '@/components/CandidatesBlock'
import { BackIcon } from '@/components/Icons'
import { api, getToken } from '@/lib/api'
import { plural } from '@/lib/text'

export default function AllCandidatesPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    Promise.all([
      api(`/api/projects/${id}/candidates?take=50`),
      api(`/api/projects/${id}/invitations`).catch(() => []),
    ])
      .then(([candidates, invites]) => {
        setData(candidates)
        setInvitations(invites)
      })
      .catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    load()
  }, [load, router])

  async function invite(candidate) {
    setBusy(true)
    setError('')
    try {
      await api(`/api/projects/${id}/invitations`, {
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

  const invitedIds = new Map(invitations.map((i) => [i.freelancer.id, i]))

  return (
    <main className="shell stack">
      <div className="topbar" style={{ marginBottom: 0 }}>
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
      </div>

      <h1 className="title-xl">Подходящие исполнители</h1>
      {data && (
        <p className="sub">
          {data.total} {plural(data.total, 'человек подходит', 'человека подходят', 'человек подходят')} по
          навыкам. Приглашений на проект можно отправить пять.
        </p>
      )}

      {error && <div className="form-error">{error}</div>}

      {data?.items.length === 0 && (
        <div className="empty">
          <h3>Подходящих пока нет</h3>
          <p className="small">
            Попробуйте добавить в проект более общие теги — например, «дизайн» вместо «айдентика».
          </p>
        </div>
      )}

      {data?.items.length > 0 && (
        <div className="list rise">
          {data.items.map((candidate) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              invitation={invitedIds.get(candidate.id)}
              onInvite={invite}
              busy={busy}
            />
          ))}
        </div>
      )}
    </main>
  )
}

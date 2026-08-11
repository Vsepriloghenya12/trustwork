'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import { ChatIcon, LockIcon } from '@/components/Icons'
import { api, getToken, getUser, formatMoney } from '@/lib/api'

export default function ChatsPage() {
  const router = useRouter()
  const [threads, setThreads] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    const user = getUser()
    Promise.all([api('/api/projects/mine'), api('/api/applications/mine').catch(() => [])])
      .then(([mine, apps]) => {
        const result = []
        for (const p of mine) {
          const isOwner = p.client.id === user.id
          // Чат существует, когда есть исполнитель, либо я — исполнитель
          if (p.freelancer) {
            const peer = isOwner ? p.freelancer : p.client
            result.push({ project: p, peer, href: `/chats/${p.id}` })
          }
        }
        // Отклики фрилансера: чат с заказчиком открыт после питча
        for (const a of apps) {
          if (a.status === 'PENDING' && !result.some((t) => t.project.id === a.project.id)) {
            result.push({
              project: { id: a.project.id, title: a.project.title, status: a.project.status },
              peer: null,
              href: `/chats/${a.project.id}`,
              pitchPending: true,
            })
          }
        }
        setThreads(result)
      })
      .catch((e) => setError(e.message))
  }, [router])

  return (
    <main className="shell stack">
      <h1 className="page-title">Чаты сделок</h1>
      {error && <div className="form-error">{error}</div>}
      {threads === null && !error && <div className="muted small">Загружаем…</div>}

      {threads?.length === 0 && (
        <div className="empty card">
          <span className="empty__icon">
            <ChatIcon />
          </span>
          <h3>Пока нет переписок</h3>
          <p className="small">
            Чат откроется, когда вы откликнетесь на проект или выберете исполнителя.
          </p>
        </div>
      )}

      {threads?.map((t) => (
        <Link key={t.project.id} href={t.href} className="card row" style={{ gap: 12 }}>
          <Avatar name={t.peer?.name || t.project.title} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              {t.peer?.name || 'Заказчик'}
            </div>
            <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.project.title}
            </div>
          </div>
          {['FUNDED', 'IN_PROGRESS'].includes(t.project.status) && (
            <span className="badge-escrow">
              <LockIcon size={12} />
              {t.project.budget ? formatMoney(t.project.budget, t.project.currency) : 'эскроу'}
            </span>
          )}
        </Link>
      ))}
    </main>
  )
}

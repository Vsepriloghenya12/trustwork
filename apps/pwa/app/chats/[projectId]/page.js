'use client'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import EscrowTimeline from '@/components/EscrowTimeline'
import { BackIcon, LockIcon, SendIcon } from '@/components/Icons'
import { api, getToken, getUser, formatMoney, formatTime } from '@/lib/api'

export default function ChatPageWrapper() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  )
}

function ChatPage() {
  const { projectId } = useParams()
  const searchParams = useSearchParams()
  const withId = searchParams.get('with')
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [messages, setMessages] = useState(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)
  const user = useRef(null)

  const qs = withId ? `?with=${withId}` : ''

  const loadMessages = useCallback(() => {
    api(`/api/projects/${projectId}/messages${qs}`)
      .then((data) => {
        setMessages(data)
        setError('')
      })
      .catch((e) => setError(e.message))
  }, [projectId, qs])

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    user.current = getUser()
    api(`/api/projects/${projectId}`).then(setProject).catch(() => {})
    loadMessages()
    const timer = setInterval(loadMessages, 4000)
    return () => clearInterval(timer)
  }, [projectId, loadMessages, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages?.length])

  async function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      await api(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        body: { text: text.trim(), ...(withId ? { with: withId } : {}) },
      })
      setText('')
      loadMessages()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="chat-screen">
      <div style={{ padding: '12px 16px 0' }}>
        <div className="topbar" style={{ marginBottom: 10 }}>
          <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
            <BackIcon />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project?.title || 'Чат сделки'}
            </div>
            <div className="small muted">Все договоренности — только здесь</div>
          </div>
        </div>

        {project && (project.escrowActive || project.status === 'COMPLETED') && (
          <div className="escrow-panel" style={{ padding: '10px 14px' }}>
            <div className="escrow-panel__title" style={{ fontSize: 13 }}>
              <LockIcon size={14} />
              {project.status === 'COMPLETED'
                ? `Сделка завершена · ${formatMoney(project.budget, project.currency)} выплачено`
                : `Эскроу активен · ${formatMoney(project.budget, project.currency)} заморожено`}
            </div>
            <EscrowTimeline status={project.status} />
          </div>
        )}
      </div>

      <div className="chat-messages">
        {error && <div className="form-error">{error}</div>}
        {messages?.length === 0 && (
          <div className="empty">
            <h3>Начните разговор</h3>
            <p className="small">
              Обсудите детали задачи. Телефоны и ссылки на мессенджеры скрываются — это защищает
              вашу сделку.
            </p>
          </div>
        )}
        {messages?.map((m) => {
          const mine = m.senderId === user.current?.id
          return (
            <div key={m.id} className={`msg ${mine ? 'msg--mine' : 'msg--theirs'}`}>
              {m.text}
              {m.wasMasked && (
                <span className="msg__masked">Контакты скрыты правилами платформы</span>
              )}
              <span className="msg__time">{formatTime(m.createdAt)}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input" onSubmit={send}>
        <input
          className="input"
          style={{ flex: 1 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение…"
        />
        <button className="sendbtn" disabled={busy || !text.trim()} aria-label="Отправить">
          <SendIcon />
        </button>
      </form>
    </div>
  )
}

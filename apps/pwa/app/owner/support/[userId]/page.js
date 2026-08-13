'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BackIcon, SendIcon } from '@/components/Icons'
import { api, getToken, formatTime } from '@/lib/api'

export default function OwnerThreadPage() {
  const { userId } = useParams()
  const router = useRouter()
  const [thread, setThread] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const load = useCallback(() => {
    api(`/api/support/threads/${userId}`)
      .then(setThread)
      .catch((e) => setError(e.message))
  }, [userId])

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    load()
    const timer = setInterval(load, 8000)
    return () => clearInterval(timer)
  }, [load, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [thread?.messages?.length])

  async function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      await api(`/api/support/threads/${userId}`, { method: 'POST', body: { text: text.trim() } })
      setText('')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="chat-screen">
      <div style={{ padding: '12px 20px 0' }}>
        <div className="topbar" style={{ marginBottom: 8 }}>
          <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
            <BackIcon />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>
              {thread?.user?.name || 'Пользователь'}
            </div>
            <div className="caption">
              {thread?.user?.phone} · {thread?.user?.role === 'CLIENT' ? 'заказчик' : 'фрилансер'}
            </div>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {error && <div className="form-error">{error}</div>}
        {thread?.messages?.map((m) => (
          <div key={m.id} className={`msg ${m.fromSupport ? 'msg--mine' : 'msg--theirs'}`}>
            {m.text}
            <span className="msg__time">{formatTime(m.createdAt)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input" onSubmit={send}>
        <input
          className="input"
          style={{ flex: 1 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ответ пользователю…"
        />
        <button className="sendbtn" disabled={busy || !text.trim()} aria-label="Отправить">
          <SendIcon />
        </button>
      </form>
    </div>
  )
}

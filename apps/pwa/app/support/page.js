'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BackIcon, SendIcon, ChatIcon } from '@/components/Icons'
import { api, getToken, formatTime } from '@/lib/api'

export default function SupportPage() {
  const router = useRouter()
  const [messages, setMessages] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const load = useCallback(() => {
    api('/api/support/messages')
      .then(setMessages)
      .catch((e) => setError(e.message))
  }, [])

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
  }, [messages?.length])

  async function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      await api('/api/support/messages', { method: 'POST', body: { text: text.trim() } })
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
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Поддержка TrustWork</div>
            <div className="caption">Отвечаем в рабочее время, обычно в течение дня</div>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {error && <div className="form-error">{error}</div>}
        {messages?.length === 0 && (
          <div className="empty">
            <span className="empty__icon">
              <ChatIcon />
            </span>
            <h3>Чем помочь?</h3>
            <p className="small">
              Опишите проблему: что происходит, на каком экране и по какому проекту. Приложим
              усилия, чтобы разобраться быстро.
            </p>
          </div>
        )}
        {messages?.map((m) => (
          <div key={m.id} className={`msg ${m.fromSupport ? 'msg--theirs' : 'msg--mine'}`}>
            {m.fromSupport && <span className="msg__author">Поддержка</span>}
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
          placeholder="Опишите проблему…"
        />
        <button className="sendbtn" disabled={busy || !text.trim()} aria-label="Отправить">
          <SendIcon />
        </button>
      </form>
    </div>
  )
}

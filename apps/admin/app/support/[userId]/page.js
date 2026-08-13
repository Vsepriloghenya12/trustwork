'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import { api, getToken, getUser, formatTime } from '@/lib/api'

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
    if (!getToken() || !getUser()?.isAdmin) {
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
    <>
      <TopBar />
      <main className="page stack">
        <div className="row">
          <Link href="/" className="btn btn--quiet" style={{ padding: 0 }}>
            ← Все обращения
          </Link>
        </div>

        <div>
          <h1 className="h1">{thread?.user?.name || 'Пользователь'}</h1>
          <p className="sub">
            {thread?.user?.phone}
            {thread?.user && ` · ${thread.user.role === 'CLIENT' ? 'заказчик' : 'фрилансер'}`}
          </p>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="card">
          <div className="chat">
            {thread?.messages?.map((m) => (
              <div key={m.id} className={`msg ${m.fromSupport ? 'msg--support' : 'msg--user'}`}>
                {m.text}
                <span className="msg__time">{formatTime(m.createdAt)}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form className="composer" onSubmit={send}>
            <input
              className="input"
              style={{ flex: 1 }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ответ пользователю…"
            />
            <button className="btn" disabled={busy || !text.trim()}>
              Отправить
            </button>
          </form>
        </div>
      </main>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackIcon, LockIcon } from '@/components/Icons'
import { api, getToken } from '@/lib/api'

export default function NewProjectPage() {
  const router = useRouter()
  const [form, setForm] = useState({ title: '', description: '', budget: '', tags: '', deadline: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) router.replace('/login')
  }, [router])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const project = await api('/api/projects', {
        method: 'POST',
        body: {
          title: form.title.trim(),
          description: form.description.trim(),
          budget: Number(form.budget),
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 10),
          ...(form.deadline ? { deadline: form.deadline } : {}),
        },
      })
      router.replace(`/projects/${project.id}`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <main className="shell stack">
      <div className="topbar" style={{ marginBottom: 4 }}>
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
        <span className="page-title">Новый проект</span>
        <span style={{ width: 42 }} />
      </div>

      <form className="stack" onSubmit={submit}>
        <div className="card stack">
          <div className="field">
            <label htmlFor="title">Название задачи</label>
            <input
              id="title"
              className="input"
              value={form.title}
              onChange={set('title')}
              placeholder="Например: логотип для кофейни"
            />
          </div>
          <div className="field">
            <label htmlFor="desc">Описание</label>
            <textarea
              id="desc"
              className="input"
              rows={6}
              value={form.description}
              onChange={set('description')}
              placeholder="Что нужно сделать, в каком виде ждете результат, что приложить к отклику…"
            />
          </div>
          <div className="field">
            <label htmlFor="budget">Бюджет, ₽</label>
            <input
              id="budget"
              className="input"
              type="number"
              min="1"
              inputMode="numeric"
              value={form.budget}
              onChange={set('budget')}
              placeholder="50000"
            />
          </div>
          <div className="field">
            <label htmlFor="tags">Теги (через запятую)</label>
            <input
              id="tags"
              className="input"
              value={form.tags}
              onChange={set('tags')}
              placeholder="дизайн, логотип"
            />
          </div>
          <div className="field">
            <label htmlFor="deadline">Срок (необязательно)</label>
            <input
              id="deadline"
              className="input"
              type="date"
              value={form.deadline}
              onChange={set('deadline')}
            />
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <button
          className="btn btn--primary"
          disabled={busy || !form.title.trim() || form.description.trim().length < 20 || !form.budget}
        >
          Создать проект
        </button>
        <p className="small muted row" style={{ gap: 6, justifyContent: 'center' }}>
          <LockIcon />
          Следующий шаг — заморозка бюджета. Без нее проект не публикуется.
        </p>
      </form>
    </main>
  )
}

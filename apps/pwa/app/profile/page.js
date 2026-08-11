'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import { StarIcon, CheckIcon, VerifiedIcon } from '@/components/Icons'
import { api, getToken, clearSession, updateStoredUser } from '@/lib/api'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    api('/api/users/me')
      .then((u) => {
        setUser(u)
        updateStoredUser(u)
      })
      .catch((e) => setError(e.message))
  }, [router])

  function startEdit() {
    setForm({
      name: user.name || '',
      bio: user.bio || '',
      skills: (user.skills || []).join(', '),
      telegram: user.telegram || '',
      github: user.github || '',
    })
    setEditing(true)
  }

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const updated = await api('/api/users/me', {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          bio: form.bio.trim(),
          skills: form.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 20),
          telegram: form.telegram.trim(),
          github: form.github.trim(),
        },
      })
      setUser(updated)
      updateStoredUser(updated)
      setEditing(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    clearSession()
    router.replace('/login')
  }

  if (!user) {
    return (
      <main className="shell stack">
        <h1 className="page-title">Профиль</h1>
        {error ? <div className="form-error">{error}</div> : <div className="muted small">Загружаем…</div>}
      </main>
    )
  }

  return (
    <main className="shell stack">
      <h1 className="page-title">Профиль</h1>

      <div className="card stack" style={{ alignItems: 'center', textAlign: 'center' }}>
        <Avatar name={user.name} size={72} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{user.name || 'Без имени'}</div>
          <div className="small muted">
            {user.role === 'CLIENT' ? 'Заказчик' : 'Фрилансер'} · {user.phone}
          </div>
        </div>
        {user.reviewsCount > 0 && (
          <div className="row small" style={{ gap: 4 }}>
            <span style={{ color: '#f5a623', display: 'inline-flex' }}>
              <StarIcon />
            </span>
            <b>{user.rating.toFixed(1)}</b>
            <span className="muted">· {user.reviewsCount} отзывов</span>
          </div>
        )}
        <div className="chips" style={{ justifyContent: 'center' }}>
          <span className="badge-escrow">
            <CheckIcon size={12} />
            Телефон подтвержден
          </span>
          {user.isVerified ? (
            <span className="badge-escrow">
              <VerifiedIcon size={13} />
              Проверенный фрилансер
            </span>
          ) : (
            <span className="chip">Новичок · до статуса «Проверенный»: {Math.max(0, 3 - user.completedDeals)} сделки</span>
          )}
          {user.telegram && <span className="chip">Telegram</span>}
          {user.github && <span className="chip">GitHub</span>}
        </div>
      </div>

      <div className="row" style={{ gap: 12 }}>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <div className="budget">{user.completedDeals}</div>
          <div className="small muted">сделок завершено</div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <div className="budget">{user.rating > 0 ? user.rating.toFixed(1) : '—'}</div>
          <div className="small muted">рейтинг</div>
        </div>
      </div>

      {user.skills?.length > 0 && !editing && (
        <div className="card stack" style={{ gap: 8 }}>
          <div className="eyebrow">Навыки</div>
          <div className="chips">
            {user.skills.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {user.bio && !editing && (
        <div className="card stack" style={{ gap: 6 }}>
          <div className="eyebrow">О себе</div>
          <p className="small">{user.bio}</p>
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {!editing ? (
        <>
          <button className="btn btn--ghost" onClick={startEdit}>
            Редактировать профиль
          </button>
          <button className="btn btn--outline-danger" onClick={logout}>
            Выйти
          </button>
        </>
      ) : (
        <form className="card stack" onSubmit={save}>
          <div className="field">
            <label>Имя</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>О себе</label>
            <textarea className="input" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Чем занимаетесь, какой опыт" />
          </div>
          <div className="field">
            <label>Навыки (через запятую)</label>
            <input className="input" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="дизайн, логотипы, айдентика" />
          </div>
          <div className="field">
            <label>Telegram (никнейм — виден как бейдж)</label>
            <input className="input" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} placeholder="username" />
          </div>
          <div className="field">
            <label>GitHub</label>
            <input className="input" value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} placeholder="username" />
          </div>
          <button className="btn btn--primary" disabled={busy}>
            Сохранить изменения
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>
            Отмена
          </button>
        </form>
      )}
    </main>
  )
}

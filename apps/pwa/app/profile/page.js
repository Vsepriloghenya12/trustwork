'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import { StarIcon, CheckIcon, VerifiedIcon, FileIcon, ChevronIcon, ChatIcon } from '@/components/Icons'
import { api, getToken, clearSession, updateStoredUser } from '@/lib/api'
import { plural, withPlural } from '@/lib/text'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [supportUnread, setSupportUnread] = useState(0)
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
    api('/api/support/unread')
      .then((r) => setSupportUnread(r.count))
      .catch(() => {})
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
        <h1 className="title-xl">Профиль</h1>
        {error ? <div className="form-error">{error}</div> : <div className="muted small">Загружаем…</div>}
      </main>
    )
  }

  return (
    <main className="shell stack" style={{ gap: 16 }}>
      <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 10, paddingTop: 8 }}>
        <Avatar name={user.name} size={72} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 19 }}>{user.name || 'Без имени'}</div>
          <div className="sub">
            {user.role === 'CLIENT' ? 'Заказчик' : 'Фрилансер'} · {user.phone}
          </div>
        </div>
        <div className="chips" style={{ justifyContent: 'center' }}>
          <span className="badge-escrow">
            <CheckIcon size={12} />
            Телефон подтвержден
          </span>
          {/* Статус «Проверенный» — про исполнителей, заказчику он не нужен */}
          {user.role === 'FREELANCER' &&
            (user.isVerified ? (
              <span className="badge-escrow">
                <VerifiedIcon size={13} />
                Проверенный фрилансер
              </span>
            ) : (
              <span className="chip">
                До статуса «Проверенный»:{' '}
                {withPlural(Math.max(0, 3 - user.completedDeals), 'сделка', 'сделки', 'сделок')} с
                эскроу
              </span>
            ))}
          {user.telegram && <span className="chip">Telegram</span>}
          {user.github && <span className="chip">GitHub</span>}
        </div>
      </div>

      <div className="stats-row">
        <div className="stats-cell">
          <div className="num">
            {user.role === 'CLIENT' ? (user.postedProjects ?? 0) : user.completedDeals}
          </div>
          <div className="caption">
            {user.role === 'CLIENT'
              ? plural(user.postedProjects ?? 0, 'проект размещен', 'проекта размещено', 'проектов размещено')
              : plural(user.completedDeals, 'сделка с эскроу', 'сделки с эскроу', 'сделок с эскроу')}
          </div>
        </div>
        <div className="stats-cell">
          <div className="num">{user.rating > 0 ? user.rating.toFixed(1) : '—'}</div>
          <div className="caption">рейтинг</div>
        </div>
        <div className="stats-cell">
          <div className="num">{user.reviewsCount}</div>
          <div className="caption">{plural(user.reviewsCount, 'отзыв', 'отзыва', 'отзывов')}</div>
        </div>
      </div>

      {user.skills?.length > 0 && !editing && (
        <section className="stack" style={{ gap: 8 }}>
          <div className="h-sec">Навыки</div>
          <div className="chips">
            {user.skills.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {user.bio && !editing && (
        <section className="stack" style={{ gap: 6 }}>
          <div className="h-sec">О себе</div>
          <p className="small">{user.bio}</p>
        </section>
      )}

      {error && <div className="form-error">{error}</div>}

      {!editing && (
        <section className="stack" style={{ gap: 0 }}>
          <div className="h-sec">Прочее</div>
          <Link href="/support" className="list-row">
            <span className="file-icon">
              <ChatIcon size={18} />
            </span>
            <span style={{ flex: 1 }}>
              <span className="file-name" style={{ display: 'block' }}>
                Поддержка
              </span>
              <span className="caption">Задать вопрос или сообщить о проблеме</span>
            </span>
            {supportUnread > 0 && <span className="unread-pill">{supportUnread}</span>}
            <span style={{ color: 'var(--c-faint)', display: 'inline-flex' }}>
              <ChevronIcon />
            </span>
          </Link>

          <Link href="/legal" className="list-row">
            <span className="file-icon">
              <FileIcon />
            </span>
            <span style={{ flex: 1 }}>
              <span className="file-name" style={{ display: 'block' }}>
                Документы и оферта
              </span>
              <span className="caption">Правила расчетов, эскроу и обработки данных</span>
            </span>
            <span style={{ color: 'var(--c-faint)', display: 'inline-flex' }}>
              <ChevronIcon />
            </span>
          </Link>

        </section>
      )}

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
        <form className="stack section" onSubmit={save}>
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

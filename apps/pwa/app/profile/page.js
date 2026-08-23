'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AvatarEditor from '@/components/AvatarEditor'
import {
  VerifiedIcon,
  FileIcon,
  ChevronIcon,
  ChatIcon,
  LockIcon,
  PlusIcon,
} from '@/components/Icons'
import Portfolio from '@/components/Portfolio'
import PayoutStatus from '@/components/PayoutStatus'
import { api, getToken, clearSession, updateStoredUser, formatMoney } from '@/lib/api'
import { plural, withPlural } from '@/lib/text'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [editing, setEditing] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
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
      social: user.social || '',
    })
    setAboutOpen(true)
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
          social: form.social.trim(),
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

  const isClient = user.role === 'CLIENT'
  const aboutTitle = isClient ? 'О компании' : 'О себе'
  const aboutFilled = Boolean(user.bio || user.skills?.length || user.social)

  return (
    <main className="shell stack" style={{ gap: 14 }}>
      {/* Шапка: аватар слева, рядом имя и телефон */}
      <header className="row" style={{ gap: 14, paddingTop: 4 }}>
        <AvatarEditor
          user={user}
          size={62}
          onUpdated={(updated) => {
            setUser(updated)
            updateStoredUser(updated)
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{user.name || 'Без имени'}</span>
            {user.isVerified && (
              <span style={{ color: 'var(--c-primary)', display: 'inline-flex' }} title="Проверенный">
                <VerifiedIcon size={15} />
              </span>
            )}
          </div>
          <div className="sub">{user.phone}</div>
          {/* Статус исполнителя: подтверждение доверия или прогресс до него */}
          {isClient ? (
            <div className="caption">Заказчик</div>
          ) : user.isVerified ? (
            <span className="badge-escrow" style={{ marginTop: 3 }}>
              <VerifiedIcon size={12} />
              Проверенный фрилансер
            </span>
          ) : (
            <div className="caption">
              До статуса «Проверенный»:{' '}
              {withPlural(Math.max(0, 3 - user.completedDeals), 'сделка', 'сделки', 'сделок')} с
              эскроу
            </div>
          )}
        </div>
      </header>

      {/* Три показателя, каждый ведет в свой раздел */}
      <div className="stats-row">
        <Link href={isClient ? '/my-projects' : '/my-projects?tab=work'} className="stats-cell">
          <div className="num">{isClient ? (user.postedProjects ?? 0) : user.completedDeals}</div>
          <div className="caption">
            {isClient
              ? plural(user.postedProjects ?? 0, 'проект', 'проекта', 'проектов')
              : plural(user.completedDeals, 'сделка', 'сделки', 'сделок')}
          </div>
        </Link>
        <div className="stats-cell">
          <div className="num">{user.rating > 0 ? user.rating.toFixed(1) : '—'}</div>
          <div className="caption">рейтинг</div>
        </div>
        <Link href="/reviews" className="stats-cell">
          <div className="num">{user.reviewsCount}</div>
          <div className="caption">{plural(user.reviewsCount, 'отзыв', 'отзыва', 'отзывов')}</div>
        </Link>
      </div>

      {/* Свернутый блок с информацией: разворачивается и редактируется */}
      <section className="accordion">
        <button
          className="accordion__head"
          onClick={() => setAboutOpen((v) => !v)}
          aria-expanded={aboutOpen}
        >
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span className="accordion__title">{aboutTitle}</span>
            <span className="caption" style={{ display: 'block' }}>
              {aboutFilled
                ? isClient
                  ? 'Видно фрилансерам в ваших проектах'
                  : 'Видят заказчики, разбирая ваши отклики'
                : 'Не заполнено'}
            </span>
          </span>
          <span className={`accordion__chevron${aboutOpen ? ' accordion__chevron--open' : ''}`}>
            <ChevronIcon />
          </span>
        </button>

        {aboutOpen && !editing && (
          <div className="accordion__body stack" style={{ gap: 10 }}>
            {user.bio ? (
              <p className="small">{user.bio}</p>
            ) : (
              <p className="caption">
                {isClient
                  ? 'Расскажите о компании: чем занимаетесь, какие задачи отдаете фрилансерам.'
                  : 'Расскажите о себе: чем занимаетесь и какие задачи беретесь решать.'}
              </p>
            )}
            {user.skills?.length > 0 && (
              <div className="chips">
                {user.skills.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </div>
            )}
            {user.social && (
              <a
                className="chip"
                href={user.social.startsWith('http') ? user.social : `https://${user.social}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ alignSelf: 'flex-start' }}
              >
                {user.social}
              </a>
            )}
            <button className="btn btn--ghost btn--compact" onClick={startEdit}>
              Редактировать
            </button>
          </div>
        )}

        {/* Подписи полей — прямо в них: подсказка исчезает, когда начинаешь вводить */}
        {aboutOpen && editing && (
          <form className="accordion__body stack" onSubmit={save}>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ваше имя"
              aria-label="Ваше имя"
            />
            <textarea
              className="input"
              rows={4}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder={
                isClient
                  ? 'О компании: чем занимаетесь, какие задачи отдаете на фриланс'
                  : 'О себе: чем занимаетесь, какой опыт'
              }
              aria-label={isClient ? 'О компании' : 'О себе'}
            />
            <input
              className="input"
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder={
                isClient ? 'Сферы работы через запятую' : 'Навыки через запятую'
              }
              aria-label={isClient ? 'Сферы работы' : 'Навыки'}
            />
            <input
              className="input"
              value={form.social}
              onChange={(e) => setForm({ ...form, social: e.target.value })}
              placeholder="Ссылка на соцсеть или сайт"
              aria-label="Ссылка на соцсеть или сайт"
            />
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn--primary" disabled={busy}>
              Сохранить
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>
              Отмена
            </button>
          </form>
        )}
      </section>

      {/* Без навыков фрилансер не попадает в подборки заказчиков */}
      {!isClient && !user.skills?.length && !editing && (
        <button className="notice notice--action" onClick={startEdit}>
          <b>Заполните навыки</b> — иначе заказчики не найдут вас в подборках исполнителей.
          Нажмите, чтобы добавить.
        </button>
      )}

      {isClient && user.escrowHeld > 0 && (
        <div className="escrow-panel" style={{ padding: '12px 14px' }}>
          <div className="escrow-panel__title" style={{ fontSize: 13 }}>
            <LockIcon size={14} />
            В эскроу заморожено: {formatMoney(user.escrowHeld)}
          </div>
        </div>
      )}

      {isClient && (
        <Link href="/projects/new" className="btn btn--primary">
          <PlusIcon size={18} />
          Разместить проект
        </Link>
      )}

      {/* Фрилансеру — деньги: что уже выплачено и что ждет в эскроу */}
      {!isClient && (user.earnedTotal > 0 || user.inWorkAmount > 0) && (
        <div className="escrow-panel" style={{ padding: '12px 14px' }}>
          <div className="escrow-panel__title" style={{ fontSize: 13 }}>
            <LockIcon size={14} />
            {user.inWorkAmount > 0
              ? `В работе под защитой эскроу: ${formatMoney(user.inWorkAmount)}`
              : `Заработано через эскроу: ${formatMoney(user.earnedTotal)}`}
          </div>
          {user.inWorkAmount > 0 && user.earnedTotal > 0 && (
            <p className="caption" style={{ marginTop: 6 }}>
              Заработано за все время: {formatMoney(user.earnedTotal)}
            </p>
          )}
        </div>
      )}

      {!isClient && (
        <PayoutStatus value={user.payoutStatus} onChange={(u) => setUser({ ...user, ...u })} />
      )}

      {!isClient && (
        <Link href="/applications" className="list-row">
          <span className="file-icon">
            <ChatIcon size={18} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="file-name" style={{ display: 'block' }}>
              Мои отклики
            </span>
            <span className="caption">Питчи и их статусы</span>
          </span>
          {user.pendingApplications > 0 && (
            <span className="status-pill">{user.pendingApplications} ждут ответа</span>
          )}
          <span style={{ color: 'var(--c-faint)', display: 'inline-flex' }}>
            <ChevronIcon />
          </span>
        </Link>
      )}

      {!isClient && user.skills?.length > 0 && !editing && (
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

      {!isClient && <Portfolio userId={user.id} editable />}

      {error && !editing && <div className="form-error">{error}</div>}

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

      <button className="btn btn--outline-danger" onClick={logout}>
        Выйти
      </button>
    </main>
  )
}

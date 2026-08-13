'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProjectCard from '@/components/ProjectCard'
import { BellIcon, PlusIcon, FeedIcon } from '@/components/Icons'
import { api, getUser } from '@/lib/api'

// Приоритет показа: с чего начинается лента
const SORTS = [
  { key: 'escrow', label: 'С эскроу' },
  { key: 'rating', label: 'Рейтинг' },
  { key: 'budget', label: 'Дороже' },
  { key: 'new', label: 'Новые' },
]

export default function FeedPage() {
  const [projects, setProjects] = useState(null)
  const [user, setUser] = useState(null)
  const [sort, setSort] = useState('escrow')
  const [error, setError] = useState('')

  useEffect(() => {
    setUser(getUser())
  }, [])

  useEffect(() => {
    setProjects(null)
    api(`/api/projects?sort=${sort}`)
      .then(setProjects)
      .catch((e) => setError(e.message))
  }, [sort])

  return (
    <main className="shell stack">
      <header>
        <div className="topbar" style={{ marginBottom: 12 }}>
          <span className="logo">
            TrustWork
            <span className="logo__dot" />
          </span>
          <div className="row">
            {user?.role === 'CLIENT' && (
              <Link href="/projects/new" className="iconbtn" aria-label="Создать проект">
                <PlusIcon />
              </Link>
            )}
            <Link href="/chats" className="iconbtn" aria-label="Уведомления">
              <BellIcon />
            </Link>
          </div>
        </div>
        <h1 className="title-xl">
          {user?.name ? `Здравствуйте, ${user.name.split(' ')[0]}!` : 'Лента проектов'}
        </h1>
      </header>

      <div className="filters" role="group" aria-label="Порядок показа проектов">
        {SORTS.map((s) => (
          <button
            key={s.key}
            className={`filter${sort === s.key ? ' filter--active' : ''}`}
            onClick={() => setSort(s.key)}
            aria-pressed={sort === s.key}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      {projects?.length === 0 && (
        <div className="empty">
          <span className="empty__icon">
            <FeedIcon />
          </span>
          <h3>Пока пусто</h3>
          <p className="small">Здесь появятся проекты заказчиков.</p>
          {user?.role === 'CLIENT' && (
            <Link href="/projects/new" className="btn btn--primary" style={{ marginTop: 16 }}>
              Создать первый проект
            </Link>
          )}
        </div>
      )}

      {projects?.length > 0 && (
        <div className="list">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {!user && projects !== null && (
        <Link href="/login" className="btn btn--primary">
          Войти по номеру телефона
        </Link>
      )}
    </main>
  )
}

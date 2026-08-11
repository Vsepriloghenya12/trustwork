'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProjectCard from '@/components/ProjectCard'
import { BellIcon, PlusIcon, FeedIcon } from '@/components/Icons'
import { api, getUser } from '@/lib/api'

export default function FeedPage() {
  const [projects, setProjects] = useState(null)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setUser(getUser())
    api('/api/projects')
      .then(setProjects)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <main className="shell stack">
      <header className="topbar">
        <div>
          <div className="topbar__greeting">
            {user?.name ? `Здравствуйте, ${user.name.split(' ')[0]}!` : 'Добро пожаловать!'}
          </div>
          <span className="logo">
            TrustWork
            <span className="logo__dot" />
          </span>
        </div>
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
      </header>

      <div className="eyebrow">Проекты с защищенной оплатой</div>

      {error && <div className="form-error">{error}</div>}
      {projects === null && !error && <div className="muted small">Загружаем ленту…</div>}

      {projects?.length === 0 && (
        <div className="empty card">
          <span className="empty__icon">
            <FeedIcon />
          </span>
          <h3>Пока пусто</h3>
          <p className="small">
            Здесь появятся проекты, у которых бюджет уже заморожен в эскроу.
          </p>
          {user?.role === 'CLIENT' && (
            <Link href="/projects/new" className="btn btn--primary" style={{ marginTop: 16 }}>
              Создать первый проект
            </Link>
          )}
        </div>
      )}

      {projects?.map((p) => (
        <ProjectCard key={p.id} project={p} />
      ))}

      {!user && projects !== null && (
        <Link href="/login" className="btn btn--primary">
          Войти по номеру телефона
        </Link>
      )}
    </main>
  )
}

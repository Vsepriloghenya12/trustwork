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
        <p className="sub" style={{ marginTop: 3 }}>
          {projects === null && !error
            ? 'Загружаем проекты…'
            : projects?.length
              ? `Открытых проектов: ${projects.length}. С эскроу — выше: их бюджет уже у платформы.`
              : 'Проекты с эскроу показываются выше — их бюджет уже у платформы.'}
        </p>
      </header>

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

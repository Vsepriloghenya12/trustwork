'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProjectCard from '@/components/ProjectCard'
import { BellIcon, PlusIcon, FeedIcon, SearchIcon } from '@/components/Icons'
import { api, getUser } from '@/lib/api'

// «Все» — весь список (проекты с эскроу выше), остальные — фильтр и приоритеты
const SORTS = [
  { key: 'all', label: 'Все', query: 'sort=escrow' },
  { key: 'escrow', label: 'С эскроу', query: 'escrow=only' },
  { key: 'rating', label: 'Рейтинг', query: 'sort=rating' },
  { key: 'budget', label: 'Дороже', query: 'sort=budget' },
]

export default function FeedPage() {
  const [projects, setProjects] = useState(null)
  const [user, setUser] = useState(null)
  const [sort, setSort] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setUser(getUser())
  }, [])

  useEffect(() => {
    setProjects(null)
    const params = new URLSearchParams(SORTS.find((s) => s.key === sort)?.query ?? '')
    if (search.trim()) params.set('search', search.trim())
    // Ждем паузу в наборе, чтобы не дергать сервер на каждую букву
    const timer = setTimeout(() => {
      api(`/api/projects?${params}`)
        .then(setProjects)
        .catch((e) => setError(e.message))
    }, 300)
    return () => clearTimeout(timer)
  }, [sort, search])

  return (
    <main className="shell stack">
      <header className="topbar" style={{ marginBottom: 2 }}>
        <span className="logo" style={{ fontSize: 19 }}>
          TrustWork
          <span className="logo__dot" />
        </span>
        <h1 className="sr-only">Лента проектов</h1>
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

      <div className="search-field">
        <SearchIcon size={18} />
        <input
          className="search-input"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Найти проект: логотип, лендинг, тексты…"
          aria-label="Поиск проектов"
        />
      </div>

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
          <span className="empty__icon">{search.trim() ? <SearchIcon /> : <FeedIcon />}</span>
          <h3>{search.trim() ? 'Ничего не нашлось' : 'Пока пусто'}</h3>
          <p className="small">
            {search.trim()
              ? 'Попробуйте другое слово или снимите фильтр.'
              : 'Здесь появятся проекты заказчиков.'}
          </p>
          {!search.trim() && user?.role === 'CLIENT' && (
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

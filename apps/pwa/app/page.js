'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ProjectCard from '@/components/ProjectCard'
import CategoryRail from '@/components/CategoryRail'
import FeedSkeleton from '@/components/FeedSkeleton'
import TrustBanner from '@/components/TrustBanner'
import { BellIcon, PlusIcon, FeedIcon, SearchIcon } from '@/components/Icons'
import { api, getUser } from '@/lib/api'
import { useSwipe, usePullToRefresh } from '@/lib/gestures'

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
  const [direction, setDirection] = useState('')
  const [error, setError] = useState('')
  const [stuck, setStuck] = useState(false)
  const sentinel = useRef(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const query = useCallback(() => {
    const params = new URLSearchParams(SORTS.find((s) => s.key === sort)?.query ?? '')
    if (search.trim()) params.set('search', search.trim())
    if (direction) params.set('tag', direction)
    return params.toString()
  }, [sort, search, direction])

  const load = useCallback(
    () =>
      api(`/api/projects?${query()}`)
        .then(setProjects)
        .catch((e) => setError(e.message)),
    [query],
  )

  useEffect(() => {
    setProjects(null)
    // Ждем паузу в наборе, чтобы не дергать сервер на каждую букву
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  // Тень под липкими вкладками появляется, только когда шапка уехала вверх
  useEffect(() => {
    const target = sentinel.current
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      rootMargin: '-1px 0px 0px 0px',
      threshold: 1,
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const sortIndex = SORTS.findIndex((s) => s.key === sort)
  const swipe = useSwipe({
    onLeft: () => setSort(SORTS[Math.min(SORTS.length - 1, sortIndex + 1)].key),
    onRight: () => setSort(SORTS[Math.max(0, sortIndex - 1)].key),
  })
  const refresh = usePullToRefresh(load)

  return (
    <main className="shell stack" {...refresh.handlers}>
      {/* Индикатор подтягивания: высота растет вслед за пальцем */}
      <div
        className="pull"
        style={{ height: refresh.pull, opacity: refresh.pull > 6 ? 1 : 0 }}
        aria-hidden
      >
        <span
          className={`pull__spinner${refresh.busy ? ' pull__spinner--busy' : ''}`}
          style={{ transform: `rotate(${refresh.pull * 4}deg)` }}
        />
      </div>

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

      <TrustBanner />

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

      <CategoryRail value={direction} onChange={setDirection} />

      <div ref={sentinel} style={{ height: 1, margin: 0 }} aria-hidden />

      <div className={`feed-sticky${stuck ? ' feed-sticky--stuck' : ''}`}>
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
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* Свайп вбок листает порядок показа, как вкладки */}
      <div {...swipe}>
        {projects === null && !error && <FeedSkeleton />}

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
          <div className="list rise" key={`${direction}-${sort}-${search}`}>
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>

      {!user && projects !== null && (
        <Link href="/login" className="btn btn--primary">
          Войти по номеру телефона
        </Link>
      )}
    </main>
  )
}

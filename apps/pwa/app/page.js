'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ProjectCard from '@/components/ProjectCard'
import CategoryRail from '@/components/CategoryRail'
import FeedSkeleton from '@/components/FeedSkeleton'
import FilterSheet from '@/components/FilterSheet'
import SubscriptionsSheet from '@/components/SubscriptionsSheet'
import InvitationsBlock from '@/components/InvitationsBlock'
import {
  BellIcon,
  PlusIcon,
  FeedIcon,
  SearchIcon,
  FilterIcon,
  BookmarkIcon,
} from '@/components/Icons'
import { api, getUser, getToken } from '@/lib/api'
import { useSwipe, usePullToRefresh } from '@/lib/gestures'

// Вкладки — это порядок показа. Условия отбора живут в шторке фильтров.
const SORTS = [
  { key: 'escrow', label: 'Все' },
  { key: 'rating', label: 'Рейтинг' },
  { key: 'budget', label: 'Дороже' },
]

const EMPTY_FILTERS = { minBudget: null, minDays: null, escrowOnly: false }

export default function FeedPage() {
  const [projects, setProjects] = useState(null)
  const [user, setUser] = useState(null)
  const [sort, setSort] = useState('escrow')
  const [search, setSearch] = useState('')
  const [direction, setDirection] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [subscriptions, setSubscriptions] = useState([])
  const [sheet, setSheet] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState('')
  const [stuck, setStuck] = useState(false)
  const sentinel = useRef(null)

  const loadSubscriptions = useCallback(() => {
    if (!getToken()) return
    api('/api/subscriptions')
      .then(setSubscriptions)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setUser(getUser())
    loadSubscriptions()
    if (getToken()) {
      api('/api/notifications/unread')
        .then((r) => setUnread(r.count))
        .catch(() => {})
    }
  }, [loadSubscriptions])

  const query = useCallback(() => {
    const params = new URLSearchParams({ sort })
    if (search.trim()) params.set('search', search.trim())
    if (direction) params.set('tag', direction)
    if (filters.minBudget) params.set('minBudget', String(filters.minBudget))
    if (filters.minDays) params.set('minDays', String(filters.minDays))
    if (filters.escrowOnly) params.set('escrow', 'only')
    return params.toString()
  }, [sort, search, direction, filters])

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

  const filtersActive = Boolean(filters.minBudget) || Boolean(filters.minDays) || filters.escrowOnly

  function flash(message) {
    setToast(message)
    setTimeout(() => setToast(''), 3200)
  }

  async function saveSubscription(state) {
    setSaving(true)
    try {
      await api('/api/subscriptions', {
        method: 'POST',
        body: {
          ...(direction ? { tag: direction } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(state.minBudget ? { minBudget: state.minBudget } : {}),
          escrowOnly: state.escrowOnly,
        },
      })
      setFilters(state)
      setSheet(null)
      loadSubscriptions()
      flash('Подписка сохранена — пришлём новые проекты')
    } catch (e) {
      flash(e.message)
    } finally {
      setSaving(false)
    }
  }

  function applySubscription(subscription) {
    setDirection(subscription.tag ?? '')
    setSearch(subscription.search ?? '')
    setFilters({
      minBudget: subscription.minBudget ?? null,
      minDays: null,
      escrowOnly: subscription.escrowOnly,
    })
    setSheet(null)
  }

  async function toggleMute(subscription) {
    await api(`/api/subscriptions/${subscription.id}`, {
      method: 'PATCH',
      body: { muted: !subscription.muted },
    }).catch(() => {})
    loadSubscriptions()
  }

  async function removeSubscription(subscription) {
    if (!confirm(`Удалить подписку «${subscription.title}»?`)) return
    await api(`/api/subscriptions/${subscription.id}`, { method: 'DELETE' }).catch(() => {})
    loadSubscriptions()
  }

  return (
    <main className="shell stack shell--feed" {...refresh.handlers}>
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
          <Link
            href="/notifications"
            className="iconbtn"
            aria-label="Уведомления"
            style={{ position: 'relative' }}
          >
            <BellIcon />
            {unread > 0 && <span className="nav__badge">{unread > 9 ? '9+' : unread}</span>}
          </Link>
        </div>
      </header>

      {user && user.role !== 'CLIENT' && <InvitationsBlock onChanged={load} />}

      <div className="search-row">
        <div className="search-field">
          <SearchIcon size={18} />
          <input
            className="search-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти проект: логотип, лендинг…"
            aria-label="Поиск проектов"
          />
        </div>
        <button
          className={`iconbtn${filtersActive ? ' iconbtn--active' : ''}`}
          onClick={() => setSheet('filters')}
          aria-label="Фильтры"
        >
          <FilterIcon />
        </button>
        {getToken() && (
          <button
            className={`iconbtn${subscriptions.length ? ' iconbtn--active' : ''}`}
            onClick={() => setSheet('subscriptions')}
            aria-label="Мои подписки"
          >
            <BookmarkIcon />
          </button>
        )}
      </div>

      <CategoryRail value={direction} onChange={setDirection} />

      {/* Датчик прокрутки: вне потока, чтобы не добавлять пустой отступ */}
      <div ref={sentinel} style={{ position: 'absolute', height: 1, width: 1 }} aria-hidden />

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
            <h3>{search.trim() || filtersActive ? 'Ничего не нашлось' : 'Пока пусто'}</h3>
            <p className="small">
              {search.trim() || filtersActive
                ? 'Попробуйте другое слово или ослабьте фильтры.'
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
          <div
            className="list rise"
            key={`${direction}-${sort}-${search}-${filters.minBudget}-${filters.minDays}-${filters.escrowOnly}`}
          >
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

      {sheet === 'filters' && (
        <FilterSheet
          value={filters}
          saving={saving}
          onApply={(state) => {
            setFilters(state)
            setSheet(null)
          }}
          onSave={saveSubscription}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === 'subscriptions' && (
        <SubscriptionsSheet
          items={subscriptions}
          onApply={applySubscription}
          onToggleMute={toggleMute}
          onDelete={removeSubscription}
          onClose={() => setSheet(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}

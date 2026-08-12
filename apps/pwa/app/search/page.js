'use client'

import { useEffect, useState } from 'react'
import ProjectCard from '@/components/ProjectCard'
import { SearchIcon } from '@/components/Icons'
import { api } from '@/lib/api'

const POPULAR_TAGS = ['дизайн', 'разработка', 'тексты', 'маркетинг', 'видео']

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('search', query.trim())
      if (tag) params.set('tag', tag)
      api(`/api/projects?${params}`)
        .then(setProjects)
        .catch((e) => setError(e.message))
    }, 300)
    return () => clearTimeout(timer)
  }, [query, tag])

  return (
    <main className="shell stack">
      <h1 className="title-xl">Поиск проектов</h1>

      <input
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Логотип, лендинг, статья…"
        type="search"
      />

      <div className="chips">
        {POPULAR_TAGS.map((t) => (
          <button
            key={t}
            className={`chip${tag === t ? ' chip--active' : ''}`}
            onClick={() => setTag(tag === t ? '' : t)}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      {projects?.length === 0 && (
        <div className="empty">
          <span className="empty__icon">
            <SearchIcon />
          </span>
          <h3>Ничего не нашлось</h3>
          <p className="small">Попробуйте другое слово или снимите фильтр по тегу.</p>
        </div>
      )}

      {projects?.map((p) => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </main>
  )
}

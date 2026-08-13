'use client'

import { BrushIcon, CodeIcon, TextIcon, MegaphoneIcon, VideoIcon, GridIcon } from './Icons'

// Направления работ. Тег совпадает с тегами проектов, поэтому фильтр работает
// на сервере без отдельного справочника.
export const DIRECTIONS = [
  { key: '', label: 'Все', icon: GridIcon, tone: 'indigo' },
  { key: 'дизайн', label: 'Дизайн', icon: BrushIcon, tone: 'violet' },
  { key: 'разработка', label: 'Разработка', icon: CodeIcon, tone: 'blue' },
  { key: 'тексты', label: 'Тексты', icon: TextIcon, tone: 'green' },
  { key: 'маркетинг', label: 'Маркетинг', icon: MegaphoneIcon, tone: 'amber' },
  { key: 'видео', label: 'Видео', icon: VideoIcon, tone: 'pink' },
]

export default function CategoryRail({ value, onChange }) {
  return (
    <nav className="rail" aria-label="Направления работ">
      {DIRECTIONS.map(({ key, label, icon: Icon, tone }) => {
        const active = value === key
        return (
          <button
            key={key || 'all'}
            className={`rail__item${active ? ' rail__item--active' : ''}`}
            onClick={() => onChange(key)}
            aria-pressed={active}
          >
            <span className={`rail__icon rail__icon--${tone}`}>
              <Icon />
            </span>
            <span className="rail__label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

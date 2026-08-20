'use client'

import { useEffect, useRef, useState } from 'react'
import { LockIcon } from './Icons'
import { api, formatMoney } from '@/lib/api'
import { plural } from '@/lib/text'

// Число не появляется рывком, а набегает — деньги «накапливаются» на глазах
function useCountUp(target, active) {
  const [value, setValue] = useState(0)
  const frame = useRef()

  useEffect(() => {
    if (!active) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    const started = performance.now()
    const duration = 900
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / duration)
      // мягкое торможение к концу
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, active])

  return value
}

export default function TrustBanner() {
  const [stats, setStats] = useState(null)
  const shown = useCountUp(stats?.escrowHeld ?? 0, Boolean(stats))

  useEffect(() => {
    api('/api/stats')
      .then(setStats)
      .catch(() => {})
  }, [])

  if (!stats) return null

  return (
    <section className="trust" aria-label="Деньги под защитой платформы">
      <div className="trust__row">
        <span className="trust__pulse" aria-hidden />
        <span className="trust__label">Сейчас под защитой</span>
        <span className="trust__lock" aria-hidden>
          <LockIcon size={18} />
        </span>
      </div>
      <div className="trust__sum">{formatMoney(shown)}</div>
      <div className="trust__meta">
        <b>{stats.openProjects}</b> {plural(stats.openProjects, 'проект', 'проекта', 'проектов')} ждут
        исполнителя · <b>{stats.completedDeals}</b>{' '}
        {plural(stats.completedDeals, 'сделка', 'сделки', 'сделок')} завершено
      </div>
    </section>
  )
}

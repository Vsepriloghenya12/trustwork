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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // В фоновой вкладке кадры не выдаются — показываем итог сразу, без анимации
    if (reduced || document.visibilityState !== 'visible') {
      setValue(target)
      return
    }
    const started = performance.now()
    const duration = 900
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    // Страховка: если анимацию прервали, итоговое число все равно верное
    const settle = setTimeout(() => setValue(target), duration + 250)
    return () => {
      cancelAnimationFrame(frame.current)
      clearTimeout(settle)
    }
  }, [target, active])

  return value
}

// projects — то, что уже загружено в ленту. По ним считаем цифры, пока
// сервер не отдаст точную статистику по всей платформе.
// Пока сервер не обновлен, эндпоинта статистики может не быть.
// Запрашиваем один раз за сеанс, дальше считаем по ленте.
let statsUnavailable = false

export default function TrustBanner({ projects }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (statsUnavailable) return
    api('/api/stats')
      .then(setStats)
      .catch(() => {
        statsUnavailable = true
      })
  }, [])

  const fromFeed = projects?.length
    ? {
        escrowHeld: projects
          .filter((p) => p.escrowActive)
          .reduce((sum, p) => sum + p.budget, 0),
        openProjects: projects.length,
        completedDeals: null,
      }
    : null

  const data = stats ?? fromFeed
  const shown = useCountUp(data?.escrowHeld ?? 0, Boolean(data))

  if (!data) return null

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
        <b>{data.openProjects}</b> {plural(data.openProjects, 'проект', 'проекта', 'проектов')} ждут
        исполнителя
        {data.completedDeals !== null && (
          <>
            {' · '}
            <b>{data.completedDeals}</b>{' '}
            {plural(data.completedDeals, 'сделка', 'сделки', 'сделок')} завершено
          </>
        )}
      </div>
    </section>
  )
}

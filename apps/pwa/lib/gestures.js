'use client'

import { useRef, useState } from 'react'

// Горизонтальный свайп. Срабатывает, только если жест явно вбок —
// иначе он мешал бы обычной прокрутке ленты.
export function useSwipe({ onLeft, onRight, threshold = 56 }) {
  const start = useRef(null)
  return {
    onTouchStart(e) {
      const touch = e.touches[0]
      start.current = { x: touch.clientX, y: touch.clientY }
    },
    onTouchEnd(e) {
      if (!start.current) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - start.current.x
      const dy = touch.clientY - start.current.y
      start.current = null
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.6) return
      if (dx < 0) onLeft?.()
      else onRight?.()
    },
  }
}

// Потянуть вниз в самом верху списка, чтобы обновить.
// Тянется с сопротивлением, как в нативных приложениях.
export function usePullToRefresh(onRefresh, { threshold = 58 } = {}) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const start = useRef(null)

  return {
    pull,
    busy,
    ready: pull >= threshold,
    handlers: {
      onTouchStart(e) {
        if (busy || window.scrollY > 2) return
        start.current = e.touches[0].clientY
      },
      onTouchMove(e) {
        if (start.current === null) return
        const delta = e.touches[0].clientY - start.current
        setPull(delta > 0 ? Math.min(86, delta * 0.45) : 0)
      },
      async onTouchEnd() {
        if (start.current === null) return
        start.current = null
        if (pull < threshold) {
          setPull(0)
          return
        }
        setBusy(true)
        setPull(46)
        try {
          await onRefresh()
        } finally {
          setBusy(false)
          setPull(0)
        }
      },
    },
  }
}

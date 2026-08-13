'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PlusIcon, TrashIcon } from './Icons'
import { API_URL, api, getToken } from '@/lib/api'

const MAX_SIDE = 1024

// Уменьшаем картинку на устройстве, чтобы работы грузились быстро
async function prepare(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
}

export default function Portfolio({ userId, editable = false }) {
  const [items, setItems] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const load = useCallback(() => {
    api(`/api/users/${userId}/portfolio`)
      .then(setItems)
      .catch(() => setItems([]))
  }, [userId])

  useEffect(load, [load])

  async function add(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const title = prompt('Название работы', file.name.replace(/\.[^.]+$/, ''))
    if (title === null) return
    setBusy(true)
    setError('')
    try {
      const blob = await prepare(file)
      const body = new FormData()
      body.append('file', blob, 'work.jpg')
      body.append('title', title.trim() || 'Работа')
      const res = await fetch(`${API_URL}/api/users/me/portfolio`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Не удалось добавить работу')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(item) {
    if (!confirm(`Удалить «${item.title}» из портфолио?`)) return
    setBusy(true)
    try {
      await api(`/api/users/me/portfolio/${item.id}`, { method: 'DELETE' })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!editable && (!items || items.length === 0)) return null

  return (
    <section className="stack" style={{ gap: 10 }}>
      <div className="row row--between">
        <span className="h-sec">Портфолио</span>
        {editable && items?.length > 0 && (
          <button
            className="caption"
            style={{ color: 'var(--c-primary)', fontWeight: 700 }}
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            Добавить
          </button>
        )}
      </div>

      {items?.length === 0 && editable && (
        <button className="btn btn--ghost" onClick={() => inputRef.current?.click()} disabled={busy}>
          <PlusIcon size={18} />
          {busy ? 'Загружаем…' : 'Добавить работу'}
        </button>
      )}

      {items?.length > 0 && (
        <div className="gallery">
          {items.map((item) => (
            <div key={item.id} className="gallery__item">
              <img
                className="gallery__img"
                src={`${API_URL}${item.imageUrl}`}
                alt={item.title}
                loading="lazy"
              />
              <span className="gallery__title">{item.title}</span>
              {editable && (
                <button
                  className="gallery__remove"
                  onClick={() => remove(item)}
                  disabled={busy}
                  aria-label={`Удалить ${item.title}`}
                >
                  <TrashIcon size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={add} />
      {error && <div className="form-error">{error}</div>}
    </section>
  )
}

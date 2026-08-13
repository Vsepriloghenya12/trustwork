'use client'

import { useRef, useState } from 'react'
import Avatar from './Avatar'
import { CameraIcon } from './Icons'
import { API_URL, getToken } from '@/lib/api'

// Уменьшаем и обрезаем фото в квадрат прямо на устройстве: на сервер уходит
// компактный JPEG вместо снимка на 5 МБ.
const SIDE = 512

async function prepare(file) {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIDE
  canvas.height = SIDE
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIDE,
    SIDE,
  )
  bitmap.close?.()
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
}

export default function AvatarEditor({ user, size = 62, onUpdated }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const blob = await prepare(file)
      const body = new FormData()
      body.append('file', blob, 'avatar.jpg')
      const res = await fetch(`${API_URL}/api/users/me/avatar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
        body,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Не удалось загрузить фото')
      onUpdated?.(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack" style={{ gap: 4 }}>
      <button
        className="avatar-edit"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={user.avatarUrl ? 'Изменить фото профиля' : 'Загрузить фото профиля'}
      >
        <Avatar name={user.name} src={user.avatarUrl} size={size} />
        <span className="avatar-edit__badge">
          <CameraIcon size={13} />
        </span>
        {busy && <span className="avatar-edit__busy">…</span>}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
      {error && <span className="form-error" style={{ fontSize: 12 }}>{error}</span>}
    </div>
  )
}

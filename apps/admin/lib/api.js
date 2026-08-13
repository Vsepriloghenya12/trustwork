export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://trustwork-production.up.railway.app'

// Отдельный ключ сессии: админка не делит вход с клиентским приложением
const TOKEN_KEY = 'tw_admin_token'
const USER_KEY = 'tw_admin_user'

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || 'Нет связи с сервером')
  }
  return data
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

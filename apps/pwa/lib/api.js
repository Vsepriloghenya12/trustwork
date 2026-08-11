export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://trustwork-production.up.railway.app'

export class ApiRequestError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('tw_token')
}

export function getUser() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem('tw_user'))
  } catch {
    return null
  }
}

export function setSession(token, user) {
  localStorage.setItem('tw_token', token)
  localStorage.setItem('tw_user', JSON.stringify(user))
}

export function updateStoredUser(user) {
  localStorage.setItem('tw_user', JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem('tw_token')
  localStorage.removeItem('tw_user')
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
    throw new ApiRequestError(res.status, data?.error || 'Нет связи с сервером, попробуйте еще раз')
  }
  return data
}

export function formatMoney(amount, currency = 'RUB') {
  const sign = currency === 'RUB' ? '₽' : currency
  return `${new Intl.NumberFormat('ru-RU').format(amount)} ${sign}`
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

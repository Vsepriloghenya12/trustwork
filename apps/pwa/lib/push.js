'use client'

import { api } from './api'

// Ключ приходит строкой base64url — Push API ждет массив байт
function decodeKey(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

// Обратное преобразование: подписка хранит ключ сервера как ArrayBuffer
function encodeKey(buffer) {
  if (!buffer) return null
  const bytes = new Uint8Array(buffer)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// На iPhone push работает только в приложении, добавленном на экран «Домой»
export function isIosWithoutInstall() {
  if (typeof window === 'undefined') return false
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const installed =
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  return ios && !installed
}

export function pushPermission() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

// Реальное состояние переключателя: мало разрешения браузера — нужна еще живая
// подписка на этом устройстве и не выключенные уведомления в профиле.
export async function pushState() {
  if (!pushSupported() || pushPermission() !== 'granted') return false
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return Boolean(subscription)
  } catch {
    return false
  }
}

export async function enablePush() {
  if (isIosWithoutInstall()) return { ok: false, reason: 'ios-install' }
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'denied' }

  const { key } = await api('/api/notifications/vapid')
  if (!key) return { ok: false, reason: 'not-configured' }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  // Подписка запоминает ключ сервера навсегда. Если ключи на сервере сменили,
  // старая подписка будет молча отвергаться — переоформляем ее на новый ключ.
  if (subscription && encodeKey(subscription.options?.applicationServerKey) !== key) {
    await api('/api/notifications/devices', {
      method: 'DELETE',
      body: { endpoint: subscription.endpoint },
    }).catch(() => {})
    await subscription.unsubscribe().catch(() => {})
    subscription = null
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(key),
    })
  }

  await api('/api/notifications/devices', { method: 'POST', body: subscription.toJSON() })
  return { ok: true }
}

export async function disablePush() {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await api('/api/notifications/devices', {
    method: 'DELETE',
    body: { endpoint: subscription.endpoint },
  }).catch(() => {})
  await subscription.unsubscribe()
}

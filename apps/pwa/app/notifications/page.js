'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BackIcon, BellIcon, LockIcon, StarIcon, ChatIcon, CheckIcon, FileIcon } from '@/components/Icons'
import { api, getToken, formatDate, formatTime } from '@/lib/api'
import { enablePush, disablePush, pushState, pushSupported, isIosWithoutInstall } from '@/lib/push'

// У каждого типа события своя иконка и цвет — список читается по диагонали
const KINDS = {
  PROJECT_MATCH: { icon: BellIcon, tone: 'indigo' },
  PROJECT_ESCROW: { icon: LockIcon, tone: 'green' },
  INVITATION: { icon: StarIcon, tone: 'amber' },
  APPLICATION_NEW: { icon: ChatIcon, tone: 'indigo' },
  APPLICATION_ACCEPTED: { icon: CheckIcon, tone: 'green' },
  PROJECT_COMPLETED: { icon: LockIcon, tone: 'green' },
  SUPPORT_REPLY: { icon: ChatIcon, tone: 'indigo' },
  APPEAL_RESOLVED: { icon: FileIcon, tone: 'indigo' },
  MESSAGE: { icon: ChatIcon, tone: 'indigo' },
}

export default function NotificationsPage() {
  const router = useRouter()
  const [items, setItems] = useState(null)
  const [pushOn, setPushOn] = useState(false)
  const [hint, setHint] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(
    () =>
      api('/api/notifications')
        .then(async (list) => {
          setItems(list)
          // Открыл экран — значит увидел; счетчик на колокольчике гасим
          if (list.some((n) => !n.readAt)) await api('/api/notifications/read', { method: 'POST' })
        })
        .catch((e) => setError(e.message)),
    [],
  )

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }
    load()
    pushState().then(setPushOn)
  }, [load, router])

  async function togglePush() {
    setHint('')
    if (pushOn) {
      await disablePush()
      await api('/api/notifications/settings', { method: 'PATCH', body: { pushEnabled: false } })
      setPushOn(false)
      return
    }
    const result = await enablePush()
    if (result.ok) {
      await api('/api/notifications/settings', { method: 'PATCH', body: { pushEnabled: true } })
      setPushOn(true)
      return
    }
    setHint(
      result.reason === 'ios-install'
        ? 'На iPhone уведомления работают в установленном приложении: «Поделиться» → «На экран „Домой“».'
        : result.reason === 'denied'
          ? 'Уведомления запрещены в настройках браузера — разрешите их для этого сайта.'
          : 'Это устройство не поддерживает push-уведомления.',
    )
  }

  return (
    <main className="shell stack">
      <div className="topbar" style={{ marginBottom: 0 }}>
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
        <h1 className="title-lg" style={{ flex: 1 }}>
          Уведомления
        </h1>
      </div>

      {(pushSupported() || isIosWithoutInstall()) && (
        <div className="switch-row">
          <span className="switch-row__label">Уведомления на телефон</span>
          <button
            className={`toggle${pushOn ? ' toggle--on' : ''}`}
            onClick={togglePush}
            role="switch"
            aria-checked={pushOn}
            aria-label="Push-уведомления"
          >
            <span className="toggle__knob" />
          </button>
        </div>
      )}
      {hint && <p className="caption">{hint}</p>}

      {error && <div className="form-error">{error}</div>}

      {items?.length === 0 && (
        <div className="empty">
          <span className="empty__icon">
            <BellIcon />
          </span>
          <h3>Пока пусто</h3>
          <p className="small">
            Здесь появятся проекты по вашим подпискам, приглашения и события ваших сделок.
          </p>
        </div>
      )}

      {items?.length > 0 && (
        <div className="list rise">
          {items.map((n) => {
            const kind = KINDS[n.kind] ?? KINDS.PROJECT_MATCH
            const Icon = kind.icon
            const row = (
              <>
                <span
                  className={`rail__icon rail__icon--${kind.tone}`}
                  style={{ width: 40, height: 40, borderRadius: 13 }}
                >
                  <Icon size={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="file-name" style={{ display: 'block', whiteSpace: 'normal' }}>
                    {n.title}
                  </span>
                  {n.body && <span className="caption">{n.body}</span>}
                </span>
                <span className="caption" style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {formatDate(n.createdAt)}
                  <br />
                  {formatTime(n.createdAt)}
                </span>
              </>
            )
            return n.projectId ? (
              <Link key={n.id} href={`/projects/${n.projectId}`} className="list-row">
                {row}
              </Link>
            ) : (
              <div key={n.id} className="list-row">
                {row}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

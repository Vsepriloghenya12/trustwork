'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, setSession } from '@/lib/api'

// Служебный вход для отладки на устройстве: /dev-login?token=... — кладет сессию
// и открывает приложение. Работает только в режиме разработки: в production-сборке
// страница отдает 404 (см. проверку ниже).
export default function DevLoginWrapper() {
  return (
    <Suspense>
      <DevLogin />
    </Suspense>
  )
}

function DevLogin() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState('Входим…')

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      setStatus('Служебный вход доступен только в режиме разработки')
      return
    }
    const token = params.get('token')
    if (!token) {
      setStatus('Не передан token')
      return
    }
    setSession(token, {})
    api('/api/users/me')
      .then((user) => {
        setSession(token, user)
        router.replace(params.get('to') || '/profile')
      })
      .catch((e) => setStatus(`Не удалось войти: ${e.message}`))
  }, [params, router])

  return (
    <main className="shell stack" style={{ paddingTop: 40 }}>
      <p className="muted">{status}</p>
    </main>
  )
}

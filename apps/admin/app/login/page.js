'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, setSession } from '@/lib/api'

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('+7')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function requestCode(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/api/auth/request-code', { method: 'POST', body: { phone } })
      setStep('code')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function verify(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await api('/api/auth/verify', { method: 'POST', body: { phone, code } })
      // В панель пускаем только владельцев платформы
      if (!res.user?.isAdmin) {
        setError('Этот номер не имеет доступа к панели владельца')
        setCode('')
        return
      }
      setSession(res.token, res.user)
      router.replace('/')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page page--narrow" style={{ paddingTop: 80 }}>
      <div className="stack" style={{ textAlign: 'center', marginBottom: 24 }}>
        <div className="brand" style={{ fontSize: 22, justifyContent: 'center' }}>
          TrustWork
          <span className="brand__tag">Владелец</span>
        </div>
        <p className="sub">Панель управления платформой</p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        {step === 'phone' ? (
          <form className="stack" onSubmit={requestCode}>
            <div className="field">
              <label htmlFor="phone">Номер телефона владельца</label>
              <input
                id="phone"
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+79001234567"
                autoFocus
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button className="btn btn--block" disabled={busy}>
              Получить код
            </button>
          </form>
        ) : (
          <form className="stack" onSubmit={verify}>
            <div className="field">
              <label htmlFor="code">Код из SMS</label>
              <input
                id="code"
                className="input"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: 19 }}
                autoFocus
              />
            </div>
            <p className="caption">Код отправлен на {phone}</p>
            {error && <div className="error">{error}</div>}
            <button className="btn btn--block" disabled={busy || code.length !== 6}>
              Войти
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setStep('phone')}>
              Изменить номер
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

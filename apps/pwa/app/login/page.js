'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, setSession, updateStoredUser } from '@/lib/api'
import { LockIcon, CheckIcon, StarIcon } from '@/components/Icons'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState('phone') // phone → code → profile
  const [phone, setPhone] = useState('+7')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('FREELANCER')
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
      setSession(res.token, res.user)
      if (res.isNew) {
        setStep('profile')
      } else {
        router.replace('/')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveProfile(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const user = await api('/api/users/me', { method: 'PATCH', body: { name, role } })
      updateStoredUser(user)
      router.replace('/')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="shell shell--bare stack" style={{ justifyContent: 'center', minHeight: '100dvh' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <span className="logo" style={{ fontSize: 26 }}>
          TrustWork
          <span className="logo__dot" />
        </span>
        <p className="muted small" style={{ marginTop: 8 }}>
          Отклики бесплатны. Оплата — под защитой эскроу.
        </p>
      </div>

      {step === 'phone' && (
        <form className="stack" onSubmit={requestCode}>
          <div className="field">
            <label htmlFor="phone">Номер телефона</label>
            <input
              id="phone"
              className="input"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+79001234567"
              autoFocus
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn--primary" disabled={busy}>
            Получить код из SMS
          </button>
        </form>
      )}

      {step === 'phone' && (
        <ul className="trust-list" style={{ marginTop: 12 }}>
          <li>
            <span className="trust-ico">
              <LockIcon size={16} />
            </span>
            <span>
              <b>Эскроу-защита оплаты.</b> Заказчик может заморозить бюджет на платформе — такие
              проекты получают бейдж «Оплата гарантирована», и деньги уже ждут исполнителя.
            </span>
          </li>
          <li>
            <span className="trust-ico">
              <StarIcon size={16} />
            </span>
            <span>
              <b>Честные рейтинги.</b> Заказчиков оценивают только фрилансеры после реального
              диалога — фейковые отзывы здесь не работают.
            </span>
          </li>
          <li>
            <span className="trust-ico">
              <CheckIcon size={16} />
            </span>
            <span>
              <b>Отклики бесплатны.</b> Никаких платных поднятий — платформа берет комиссию только
              с успешной сделки.
            </span>
          </li>
        </ul>
      )}

      {step === 'code' && (
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
              placeholder="••••••"
              style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: 20 }}
              autoFocus
            />
          </div>
          <p className="small muted">Отправили код на {phone}</p>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn--primary" disabled={busy || code.length !== 6}>
            Войти
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setStep('phone')}>
            Изменить номер
          </button>
        </form>
      )}

      {step === 'profile' && (
        <form className="stack" onSubmit={saveProfile}>
          <div className="title-lg">Расскажите о себе</div>
          <div className="row" style={{ gap: 10 }}>
            {[
              { value: 'FREELANCER', label: 'Я фрилансер', hint: 'Ищу проекты' },
              { value: 'CLIENT', label: 'Я заказчик', hint: 'Ищу исполнителей' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className="stack"
                style={{
                  flex: 1,
                  gap: 2,
                  textAlign: 'left',
                  padding: 14,
                  borderRadius: 16,
                  border:
                    role === opt.value
                      ? '2px solid var(--c-primary)'
                      : '1.5px solid var(--c-line)',
                  background: role === opt.value ? 'var(--c-primary-soft)' : '#fff',
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 14 }}>{opt.label}</span>
                <span className="small muted">{opt.hint}</span>
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="name">Имя</label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как к вам обращаться"
              autoFocus
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn--primary" disabled={busy || !name.trim()}>
            Начать работу
          </button>
        </form>
      )}
    </main>
  )
}

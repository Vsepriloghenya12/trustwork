'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import { api, getToken, getUser, formatDateTime } from '@/lib/api'

function money(amount) {
  return `${(amount ?? 0).toLocaleString('ru-RU')} ₽`
}

function days(date) {
  if (!date) return null
  return Math.ceil((new Date(date) - Date.now()) / 86400000)
}

export default function ArbitrationPage() {
  const router = useRouter()
  const [disputes, setDisputes] = useState(null)
  const [payouts, setPayouts] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  // Черновики решений: сколько присудить исполнителю и что написать сторонам
  const [drafts, setDrafts] = useState({})

  const load = useCallback(() => {
    api('/api/arbitration/disputes')
      .then(setDisputes)
      .catch((e) => setError(e.message))
    api('/api/arbitration/payouts')
      .then(setPayouts)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!getToken() || !getUser()?.isAdmin) {
      router.replace('/login')
      return
    }
    load()
  }, [load, router])

  function draft(id, patch) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }))
  }

  async function run(id, fn) {
    setBusyId(id)
    setError('')
    try {
      await fn()
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  function resolve(dispute) {
    const state = drafts[dispute.id] ?? {}
    const payout = Number(state.payout ?? 0)
    const resolution = (state.resolution ?? '').trim()
    if (resolution.length < 5) {
      setError('Напишите решение — его увидят обе стороны')
      return
    }
    const share = payout === 0 ? 'ничего' : money(payout)
    if (!confirm(`Исполнителю уйдет ${share}, остальное вернется заказчику. Подтвердить?`)) return
    run(dispute.id, () =>
      api(`/api/arbitration/disputes/${dispute.id}/resolve`, {
        method: 'POST',
        body: { payoutToFreelancer: payout, resolution },
      }),
    )
  }

  return (
    <>
      <TopBar />
      <main className="page stack">
        <div>
          <h1 className="h1">Разбирательства</h1>
          <p className="sub">
            Споры по сделкам и деньги, которые не удалось выплатить. Решение здесь двигает реальные
            деньги — оно окончательное.
          </p>
        </div>

        {error && <div className="error">{error}</div>}

        <section className="stack">
          <h2 className="h1" style={{ fontSize: 20 }}>
            Споры{disputes ? ` · ${disputes.length}` : ''}
          </h2>

          {disputes?.length === 0 && (
            <div className="card empty">
              <h3>Споров нет</h3>
              <p className="small">Здесь появятся сделки, по которым стороны не договорились.</p>
            </div>
          )}

          {disputes?.map((d) => (
            <div key={d.id} className="card" style={{ padding: 18 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="thread-name">{d.project.title}</span>
                <span className="caption">{formatDateTime(d.createdAt)}</span>
              </div>

              <div className="stack" style={{ gap: 4, marginBottom: 12 }}>
                <span className="caption">
                  Бюджет {money(d.project.budget)} · заказчик{' '}
                  {d.project.client.name || 'без имени'} · исполнитель{' '}
                  {d.project.freelancer?.name || 'не выбран'}
                </span>
                <span className="role-tag">
                  {d.needsSupport
                    ? 'Три дня вышли — решает поддержка'
                    : `Стороны договариваются сами, у них есть ${days(d.supportAt)} дн.`}
                </span>
              </div>

              <div className="stack" style={{ gap: 6, marginBottom: 14 }}>
                <span className="caption">
                  Спор открыл: {d.openedBy.name || d.openedBy.phone || 'пользователь'}
                </span>
                <div style={{ fontSize: 14.5 }}>{d.reason}</div>
              </div>

              <div className="stack" style={{ gap: 8 }}>
                <div className="field">
                  <label htmlFor={`payout-${d.id}`}>Исполнителю, ₽</label>
                  <input
                    id={`payout-${d.id}`}
                    className="input"
                    type="number"
                    min="0"
                    max={d.project.budget}
                    value={drafts[d.id]?.payout ?? ''}
                    onChange={(e) => draft(d.id, { payout: e.target.value })}
                    placeholder="0"
                  />
                  <span className="caption">
                    Ноль — деньги возвращаются заказчику целиком. Комиссия платформы берется только
                    с выплаченной части.
                  </span>
                </div>
                <div className="field">
                  <label htmlFor={`resolution-${d.id}`}>Решение</label>
                  <textarea
                    id={`resolution-${d.id}`}
                    className="input"
                    rows={3}
                    value={drafts[d.id]?.resolution ?? ''}
                    onChange={(e) => draft(d.id, { resolution: e.target.value })}
                    placeholder="Что решено и почему — увидят обе стороны"
                  />
                </div>
                <div className="row">
                  <button className="btn" disabled={busyId === d.id} onClick={() => resolve(d)}>
                    Вынести решение
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="stack">
          <h2 className="h1" style={{ fontSize: 20 }}>
            Застрявшие выплаты{payouts ? ` · ${payouts.length}` : ''}
          </h2>
          <p className="sub">
            Работа принята, деньги списаны, но у исполнителя нет статуса самозанятого или ИП —
            перечислить их платформа не вправе. Рычага два: продлить срок или вернуть заказчику.
          </p>

          {payouts?.length === 0 && (
            <div className="card empty">
              <h3>Все выплачено</h3>
              <p className="small">Денег, ожидающих статуса исполнителя, нет.</p>
            </div>
          )}

          {payouts?.map((p) => (
            <div key={p.id} className="card" style={{ padding: 18 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="thread-name">{p.title}</span>
                <span className="role-tag">
                  {p.overdue ? 'Срок вышел' : `Осталось ${p.daysLeft} дн.`}
                </span>
              </div>
              <p className="caption" style={{ marginBottom: 14 }}>
                {money(p.budget)} · исполнитель {p.freelancer?.name || 'без имени'} · работа принята{' '}
                {formatDateTime(p.acceptedAt)}
              </p>
              <div className="row">
                <button
                  className="btn btn--ghost"
                  disabled={busyId === p.id}
                  onClick={() =>
                    run(p.id, () =>
                      api(`/api/arbitration/payouts/${p.id}/extend`, { method: 'POST' }),
                    )
                  }
                >
                  Продлить на 30 дней
                </button>
                <button
                  className="btn btn--ghost"
                  disabled={busyId === p.id}
                  onClick={() => {
                    if (!confirm('Вернуть деньги заказчику? Исполнитель их уже не получит.')) return
                    run(p.id, () =>
                      api(`/api/arbitration/payouts/${p.id}/close`, { method: 'POST' }),
                    )
                  }}
                >
                  Вернуть заказчику
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>
    </>
  )
}

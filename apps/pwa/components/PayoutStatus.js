'use client'

import { useState } from 'react'
import { api, formatMoney } from '@/lib/api'
import { CheckIcon, LockIcon } from '@/components/Icons'

// Платформа перечисляет деньги только самозанятым и ИП. Выплата обычному физлицу
// сделала бы ее налоговым агентом и потребовала бы страховых взносов сверх суммы
// сделки — на заказе в 30 000 ₽ это 9 000 ₽ расхода против 1 500 ₽ комиссии.
const OPTIONS = [
  {
    value: 'SELF_EMPLOYED',
    label: 'Самозанятый',
    hint: 'Налог платите сами через «Мой налог». Чек за работу банк сформирует автоматически.',
  },
  {
    value: 'ENTREPRENEUR',
    label: 'ИП',
    hint: 'Работаете как индивидуальный предприниматель.',
  },
  {
    value: 'NONE',
    label: 'Статуса нет',
    hint: 'Откликаться и работать можно, но получить выплату через платформу — нет.',
  },
]

export default function PayoutStatus({ value, onChange }) {
  const [busy, setBusy] = useState(false)
  const [paid, setPaid] = useState([])
  const [error, setError] = useState('')

  async function select(status) {
    if (status === value || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await api('/api/users/me/payout-status', {
        method: 'POST',
        body: { status },
      })
      // Деньги, ждавшие статуса, уходят сразу — об этом стоит сказать вслух
      setPaid(result.paidOut ?? [])
      onChange?.(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="stack" style={{ gap: 8 }}>
      <div className="h-sec">Статус для выплат</div>
      <p className="caption">
        Виден заказчикам до найма. Проекты с эскроу выбирают исполнителей со статусом: деньги
        платформа вправе перечислить только самозанятым и ИП.
      </p>

      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`choice${value === option.value ? ' choice--active' : ''}`}
          onClick={() => select(option.value)}
          aria-pressed={value === option.value}
          disabled={busy}
        >
          <span
            className={`choice__icon${option.value !== 'NONE' ? ' choice__icon--green' : ''}`}
          >
            {value === option.value ? <CheckIcon size={16} /> : <LockIcon size={16} />}
          </span>
          <span className="choice__body">
            <span className="choice__title">{option.label}</span>
            <span className="caption">{option.hint}</span>
          </span>
        </button>
      ))}

      {paid.length > 0 && (
        <div className="notice notice--action">
          <b>Выплаты отправлены.</b>{' '}
          {paid.map((p) => `${p.title} — ${formatMoney(p.amount)}`).join(', ')}
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
    </section>
  )
}

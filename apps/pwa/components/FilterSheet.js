'use client'

import { useState } from 'react'
import { LockIcon } from './Icons'
import { formatMoney } from '@/lib/api'

const BUDGETS = [
  { value: null, label: 'Любой' },
  { value: 10000, label: 'от 10 000' },
  { value: 25000, label: 'от 25 000' },
  { value: 50000, label: 'от 50 000' },
  { value: 100000, label: 'от 100 000' },
]

const TERMS = [
  { value: null, label: 'Любой' },
  { value: 7, label: 'от недели' },
  { value: 14, label: 'от 2 недель' },
  { value: 30, label: 'от месяца' },
]

export default function FilterSheet({ value, onApply, onClose, onSave, saving }) {
  const [minBudget, setMinBudget] = useState(value.minBudget ?? null)
  const [minDays, setMinDays] = useState(value.minDays ?? null)
  const [escrowOnly, setEscrowOnly] = useState(value.escrowOnly ?? false)

  const state = { minBudget, minDays, escrowOnly }
  const dirty =
    minBudget !== (value.minBudget ?? null) ||
    minDays !== (value.minDays ?? null) ||
    escrowOnly !== (value.escrowOnly ?? false)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
        <span className="sheet__handle" aria-hidden />
        <div className="title-lg">Фильтры</div>

        <section className="stack" style={{ gap: 8 }}>
          <div className="h-sec">Минимальный бюджет</div>
          <div className="chips">
            {BUDGETS.map((b) => (
              <button
                key={b.label}
                className={`chip${minBudget === b.value ? ' chip--active' : ''}`}
                onClick={() => setMinBudget(b.value)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </section>

        <section className="stack" style={{ gap: 8 }}>
          <div className="h-sec">Запас по сроку</div>
          <div className="chips">
            {TERMS.map((t) => (
              <button
                key={t.label}
                className={`chip${minDays === t.value ? ' chip--active' : ''}`}
                onClick={() => setMinDays(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        <div className="switch-row">
          <span className="switch-row__label row" style={{ gap: 7 }}>
            <LockIcon size={15} />
            Только с эскроу
          </span>
          <button
            className={`toggle${escrowOnly ? ' toggle--on' : ''}`}
            onClick={() => setEscrowOnly((v) => !v)}
            role="switch"
            aria-checked={escrowOnly}
            aria-label="Только проекты с замороженным бюджетом"
          >
            <span className="toggle__knob" />
          </button>
        </div>

        <button className="btn btn--primary" onClick={() => onApply(state)}>
          {dirty ? 'Применить фильтры' : 'Готово'}
        </button>

        {/* Условия заданы здесь же — логично отсюда и следить за ними */}
        <button className="btn btn--ghost" onClick={() => onSave(state)} disabled={saving}>
          {saving ? 'Сохраняем…' : 'Следить за этим поиском'}
        </button>
        <p className="caption" style={{ textAlign: 'center' }}>
          Пришлём уведомление, когда появится подходящий проект
          {minBudget ? ` дороже ${formatMoney(minBudget)}` : ''}.
        </p>
      </div>
    </div>
  )
}

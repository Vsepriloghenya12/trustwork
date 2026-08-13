'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackIcon, LockIcon, PlusIcon, FileIcon, CheckIcon } from '@/components/Icons'
import { api, getToken, API_URL, formatMoney } from '@/lib/api'
import {
  CATEGORIES,
  BUDGET_PRESETS,
  DEADLINE_PRESETS,
  COMMISSION_RATE,
  freelancerPayout,
} from '@/lib/constants'

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} КБ` : `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

export default function NewProjectPage() {
  const router = useRouter()
  const fileInput = useRef(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState([])
  const [customTag, setCustomTag] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('14')
  const [customDate, setCustomDate] = useState('')
  const [files, setFiles] = useState([])
  const [filesVisibility, setFilesVisibility] = useState('PUBLIC')
  const [withEscrow, setWithEscrow] = useState(true)
  const [step, setStep] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) router.replace('/login')
  }, [router])

  const budgetValue = Number(budget) || 0
  const payout = freelancerPayout(budgetValue)

  function toggleCategory(cat) {
    setCategories((list) => (list.includes(cat) ? list.filter((c) => c !== cat) : [...list, cat]))
  }

  function addFiles(e) {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    setError('')
    const room = MAX_FILES - files.length
    const accepted = []
    for (const file of picked.slice(0, room)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`Файл «${file.name}» больше 10 МБ`)
        continue
      }
      accepted.push(file)
    }
    setFiles((prev) => [...prev, ...accepted])
  }

  function deadlineDate() {
    if (deadline === 'custom') return customDate || undefined
    const preset = DEADLINE_PRESETS.find((d) => d.key === deadline)
    if (!preset?.days) return undefined
    const date = new Date()
    date.setDate(date.getDate() + preset.days)
    return date.toISOString().slice(0, 10)
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setStep('Создаем проект…')
      const tags = [...categories, ...customTag.split(',').map((t) => t.trim()).filter(Boolean)].slice(0, 10)
      const project = await api('/api/projects', {
        method: 'POST',
        body: {
          title: title.trim(),
          description: description.trim(),
          budget: budgetValue,
          tags,
          ...(deadlineDate() ? { deadline: deadlineDate() } : {}),
        },
      })

      for (const [i, file] of files.entries()) {
        setStep(`Загружаем файлы… ${i + 1} из ${files.length}`)
        const body = new FormData()
        body.append('file', file)
        body.append('visibility', filesVisibility)
        const res = await fetch(`${API_URL}/api/projects/${project.id}/files`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || `Не удалось загрузить «${file.name}»`)
        }
      }

      setStep(withEscrow ? 'Замораживаем бюджет…' : 'Публикуем проект…')
      const result = await api(`/api/projects/${project.id}/${withEscrow ? 'fund' : 'publish'}`, {
        method: 'POST',
      })
      if (result.confirmationUrl) {
        window.location.href = result.confirmationUrl
        return
      }
      router.replace(`/projects/${project.id}`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
      setStep('')
    }
  }

  const canSubmit =
    title.trim().length >= 5 && description.trim().length >= 20 && budgetValue > 0 && !busy

  return (
    <main className="shell stack" style={{ paddingBottom: 120 }}>
      <div className="topbar" style={{ marginBottom: 0 }}>
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
        <span className="title-lg">Новый проект</span>
        <span style={{ width: 42 }} />
      </div>

      <form className="stack" onSubmit={submit} style={{ gap: 20 }}>
        <div className="stack" style={{ gap: 10 }}>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название задачи: логотип для кофейни"
            aria-label="Название задачи"
          />
          <textarea
            className="input"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Что нужно сделать, в каком виде ждете результат, что приложить к отклику…"
            aria-label="Описание задачи"
          />
        </div>

        <section className="stack" style={{ gap: 8 }}>
          <div className="h-sec">Категории</div>
          <div className="chips">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip${categories.includes(cat) ? ' chip--active' : ''}`}
                onClick={() => toggleCategory(cat)}
                aria-pressed={categories.includes(cat)}
              >
                {categories.includes(cat) && <CheckIcon size={12} />}
                {cat}
              </button>
            ))}
          </div>
          <input
            className="input"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            placeholder="Свои теги через запятую"
            aria-label="Свои теги"
          />
        </section>

        <section className="stack" style={{ gap: 8 }}>
          <div className="h-sec">Бюджет</div>
          <div className="chips">
            {BUDGET_PRESETS.map((sum) => (
              <button
                key={sum}
                type="button"
                className={`chip${budgetValue === sum ? ' chip--active' : ''}`}
                onClick={() => setBudget(String(sum))}
              >
                {formatMoney(sum)}
              </button>
            ))}
          </div>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min="1"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Своя сумма, ₽"
            aria-label="Бюджет"
          />
          {budgetValue > 0 && (
            <p className="caption">
              Исполнитель получит <b>{formatMoney(payout)}</b> — комиссия платформы{' '}
              {Math.round(COMMISSION_RATE * 100)}% удерживается только с успешной сделки через
              эскроу.
            </p>
          )}
        </section>

        <section className="stack" style={{ gap: 8 }}>
          <div className="h-sec">Срок</div>
          <div className="chips">
            {DEADLINE_PRESETS.map((d) => (
              <button
                key={d.key}
                type="button"
                className={`chip${deadline === d.key ? ' chip--active' : ''}`}
                onClick={() => setDeadline(d.key)}
              >
                {d.label}
              </button>
            ))}
          </div>
          {deadline === 'custom' && (
            <input
              className="input"
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              aria-label="Своя дата"
            />
          )}
        </section>

        <section className="stack" style={{ gap: 8 }}>
          <div className="h-sec">Файлы задачи</div>
          <p className="caption">ТЗ, макеты, примеры — до 5 файлов, каждый до 10 МБ.</p>

          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="file-row">
              <span className="file-icon">
                <FileIcon />
              </span>
              <span className="file-main">
                <span className="file-name">{file.name}</span>
                <span className="caption">{formatSize(file.size)}</span>
              </span>
              <button
                type="button"
                className="btn btn--outline-danger btn--compact"
                onClick={() => setFiles((list) => list.filter((_, idx) => idx !== i))}
              >
                Убрать
              </button>
            </div>
          ))}

          {files.length > 0 && (
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="caption">Кто откроет файлы:</span>
              <button
                type="button"
                className={`chip${filesVisibility === 'PUBLIC' ? ' chip--active' : ''}`}
                onClick={() => setFilesVisibility('PUBLIC')}
              >
                Все
              </button>
              <button
                type="button"
                className={`chip${filesVisibility === 'APPLICANTS' ? ' chip--active' : ''}`}
                onClick={() => setFilesVisibility('APPLICANTS')}
              >
                Только откликнувшиеся
              </button>
            </div>
          )}

          {files.length < MAX_FILES && (
            <button type="button" className="btn btn--ghost" onClick={() => fileInput.current?.click()}>
              <PlusIcon size={18} />
              Прикрепить файл
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            hidden
            multiple
            onChange={addFiles}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.zip,.doc,.docx,.xls,.xlsx"
          />
        </section>

        <section className="stack" style={{ gap: 8 }}>
          <div className="h-sec">Как публикуем</div>
          <button
            type="button"
            className={`choice${withEscrow ? ' choice--active' : ''}`}
            onClick={() => setWithEscrow(true)}
            aria-pressed={withEscrow}
          >
            <span className="choice__icon choice__icon--green">
              <LockIcon size={16} />
            </span>
            <span className="choice__body">
              <span className="choice__title">С эскроу — оплата гарантирована</span>
              <span className="caption">
                Бюджет замораживается на платформе. Проект получает бейдж и показывается выше в
                ленте, фрилансеры откликаются охотнее.
              </span>
            </span>
          </button>
          <button
            type="button"
            className={`choice${!withEscrow ? ' choice--active' : ''}`}
            onClick={() => setWithEscrow(false)}
            aria-pressed={!withEscrow}
          >
            <span className="choice__icon">
              <FileIcon size={16} />
            </span>
            <span className="choice__body">
              <span className="choice__title">Без эскроу</span>
              <span className="caption">
                Публикация бесплатна, оплата напрямую по договоренности. Гарантий платформы нет,
                эскроу можно подключить позже.
              </span>
            </span>
          </button>
        </section>

        {error && <div className="form-error">{error}</div>}

        <div className="sticky-action">
          <button className="btn btn--primary" disabled={!canSubmit}>
            {busy
              ? step || 'Публикуем…'
              : withEscrow && budgetValue > 0
                ? `Опубликовать и заморозить ${formatMoney(budgetValue)}`
                : 'Опубликовать проект'}
          </button>
        </div>
      </form>
    </main>
  )
}

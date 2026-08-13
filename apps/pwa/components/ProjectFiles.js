'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { LockIcon, FileIcon, PlusIcon } from './Icons'
import { API_URL, api, getToken } from '@/lib/api'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

export default function ProjectFiles({ projectId, isOwner }) {
  const [files, setFiles] = useState(null)
  const [visibility, setVisibility] = useState('PUBLIC')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const load = useCallback(() => {
    api(`/api/projects/${projectId}/files`)
      .then(setFiles)
      .catch(() => setFiles([]))
  }, [projectId])

  useEffect(load, [load])

  async function upload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('visibility', visibility)
      const res = await fetch(`${API_URL}/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Не удалось загрузить файл')
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleVisibility(file) {
    const next = file.visibility === 'PUBLIC' ? 'APPLICANTS' : 'PUBLIC'
    setBusy(true)
    try {
      await api(`/api/projects/${projectId}/files/${file.id}`, {
        method: 'PATCH',
        body: { visibility: next },
      })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(file) {
    if (!confirm(`Удалить файл «${file.name}»?`)) return
    setBusy(true)
    try {
      await api(`/api/projects/${projectId}/files/${file.id}`, { method: 'DELETE' })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  function download(file) {
    // Токен нужен для закрытых файлов: качаем через fetch и отдаем как blob
    setBusy(true)
    fetch(`${API_URL}/api/projects/${projectId}/files/${file.id}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || 'Не удалось открыть файл')
        }
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false))
  }

  if (!isOwner && (!files || files.length === 0)) return null

  return (
    <section className="section">
      <div className="h-sec">Файлы задачи {files?.length ? <b>· {files.length}</b> : ''}</div>

      {files?.length === 0 && isOwner && (
        <p className="caption">Приложите ТЗ, макеты или примеры — до 5 файлов, каждый до 10 МБ.</p>
      )}

      {files?.map((f) => (
        <div key={f.id} className="file-row">
          <span className={`file-icon${f.canDownload ? '' : ' file-icon--locked'}`}>
            {f.canDownload ? <FileIcon /> : <LockIcon size={16} />}
          </span>
          <button
            className="file-main"
            onClick={() => (f.canDownload ? download(f) : null)}
            disabled={!f.canDownload || busy}
          >
            <span className="file-name">{f.name}</span>
            <span className="caption">
              {formatSize(f.size)}
              {f.visibility === 'APPLICANTS' &&
                (f.canDownload ? ' · только для откликнувшихся' : ' · откроется после отклика')}
            </span>
          </button>
          {isOwner && (
            <div className="row" style={{ gap: 4 }}>
              <button
                className="btn btn--ghost btn--compact"
                onClick={() => toggleVisibility(f)}
                disabled={busy}
                title={
                  f.visibility === 'PUBLIC'
                    ? 'Сейчас виден всем — закрыть'
                    : 'Сейчас только откликнувшимся — открыть всем'
                }
              >
                {f.visibility === 'PUBLIC' ? 'Всем' : 'Откликнувшимся'}
              </button>
              <button className="btn btn--outline-danger btn--compact" onClick={() => remove(f)} disabled={busy}>
                Удалить
              </button>
            </div>
          )}
        </div>
      ))}

      {isOwner && (
        <>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="caption">Кто откроет новый файл:</span>
            <button
              className={`chip${visibility === 'PUBLIC' ? ' chip--active' : ''}`}
              onClick={() => setVisibility('PUBLIC')}
            >
              Все
            </button>
            <button
              className={`chip${visibility === 'APPLICANTS' ? ' chip--active' : ''}`}
              onClick={() => setVisibility('APPLICANTS')}
            >
              Только откликнувшиеся
            </button>
          </div>
          <button
            className="btn btn--ghost"
            onClick={() => inputRef.current?.click()}
            disabled={busy || files?.length >= 5}
          >
            <PlusIcon size={18} />
            {busy ? 'Загружаем…' : 'Прикрепить файл'}
          </button>
          <input
            ref={inputRef}
            type="file"
            hidden
            onChange={upload}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.zip,.doc,.docx,.xls,.xlsx"
          />
        </>
      )}

      {error && <div className="form-error">{error}</div>}
    </section>
  )
}

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BackIcon, FileIcon, ChevronIcon } from '@/components/Icons'
import { LEGAL_DOCS, LEGAL_UPDATED } from '@/lib/legal'

export default function LegalPage() {
  const router = useRouter()
  return (
    <main className="shell stack">
      <div className="topbar" style={{ marginBottom: 0 }}>
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
      </div>

      <h1 className="title-xl">Документы</h1>
      <p className="sub">Правила платформы, расчетов и обработки данных. Обновлено {LEGAL_UPDATED}.</p>

      <div className="list" style={{ borderTop: '1px solid var(--c-line)' }}>
        {LEGAL_DOCS.map((doc) => (
          <Link key={doc.slug} href={`/legal/${doc.slug}`} className="list-row">
            <span className="file-icon">
              <FileIcon />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="file-name" style={{ display: 'block' }}>
                {doc.title}
              </span>
              <span className="caption">{doc.summary}</span>
            </span>
            <span style={{ color: 'var(--c-faint)', display: 'inline-flex' }}>
              <ChevronIcon />
            </span>
          </Link>
        ))}
      </div>

      <p className="caption">
        Вопросы по документам и работе платформы — в поддержку: [почта для обращений].
      </p>
    </main>
  )
}

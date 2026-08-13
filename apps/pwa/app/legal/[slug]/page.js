'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BackIcon } from '@/components/Icons'
import { findLegalDoc, LEGAL_UPDATED } from '@/lib/legal'

export default function LegalDocPage() {
  const { slug } = useParams()
  const router = useRouter()
  const doc = findLegalDoc(slug)

  if (!doc) {
    return (
      <main className="shell stack">
        <div className="topbar" style={{ marginBottom: 0 }}>
          <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
            <BackIcon />
          </button>
        </div>
        <h1 className="title-xl">Документ не найден</h1>
        <Link href="/legal" className="btn btn--ghost">
          Все документы
        </Link>
      </main>
    )
  }

  return (
    <main className="shell stack">
      <div className="topbar" style={{ marginBottom: 0 }}>
        <button className="iconbtn" onClick={() => router.back()} aria-label="Назад">
          <BackIcon />
        </button>
      </div>

      <h1 className="title-xl">{doc.title}</h1>
      <p className="caption">Редакция от {LEGAL_UPDATED}</p>

      <div className="notice">
        Проект документа. До приема реальных платежей он должен быть проверен юристом и дополнен
        реквизитами организации.
      </div>

      {doc.sections.map((section) => (
        <section key={section.h} className="section">
          <h2 className="doc-h">{section.h}</h2>
          {section.p.map((text, i) => (
            <p key={i} className="doc-p">
              {text}
            </p>
          ))}
        </section>
      ))}

      <Link href="/legal" className="btn btn--ghost">
        Другие документы
      </Link>
    </main>
  )
}

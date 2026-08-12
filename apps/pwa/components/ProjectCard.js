import Link from 'next/link'
import Avatar from './Avatar'
import { LockIcon, StarIcon, VerifiedIcon } from './Icons'
import { formatMoney, formatDate } from '@/lib/api'

export default function ProjectCard({ project }) {
  return (
    <Link href={`/projects/${project.id}`} className="card stack" style={{ gap: 10 }}>
      <div className="row row--between">
        {project.escrowActive ? (
          <span className="badge-escrow">
            <LockIcon />
            Оплата в эскроу
          </span>
        ) : (
          <span className="chip" style={{ color: 'var(--c-muted)' }}>Эскроу не подключен</span>
        )}
        <span className="small muted">{formatDate(project.createdAt)}</span>
      </div>
      <div className="card__title">{project.title}</div>
      <div className="card__desc">{project.description}</div>
      <div className="row row--between">
        <span className="budget">{formatMoney(project.budget, project.currency)}</span>
        <span className="chips">
          {project.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </span>
      </div>
      <div className="row" style={{ borderTop: '1px solid var(--c-line)', paddingTop: 10 }}>
        <Avatar name={project.client.name} size={28} />
        <span className="small" style={{ fontWeight: 700 }}>
          {project.client.name || 'Заказчик'}
        </span>
        {project.client.isVerified && (
          <span style={{ color: 'var(--c-primary)', display: 'inline-flex' }}>
            <VerifiedIcon />
          </span>
        )}
        {project.client.reviewsCount > 0 && (
          <span className="small muted row" style={{ gap: 3, marginLeft: 'auto' }}>
            <span style={{ color: '#f5a623', display: 'inline-flex' }}>
              <StarIcon />
            </span>
            {project.client.rating.toFixed(1)}
          </span>
        )}
      </div>
    </Link>
  )
}

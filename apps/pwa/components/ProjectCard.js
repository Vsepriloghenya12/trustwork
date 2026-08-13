import Link from 'next/link'
import Avatar from './Avatar'
import { LockIcon, StarIcon, VerifiedIcon } from './Icons'
import { formatMoney, formatDate } from '@/lib/api'

export default function ProjectCard({ project }) {
  return (
    <Link href={`/projects/${project.id}`} className="project-row">
      <div className="row row--between">
        {project.escrowActive ? (
          <span className="badge-escrow">
            <LockIcon />
            Оплата в эскроу
          </span>
        ) : (
          <span className="caption">Эскроу не подключен</span>
        )}
        <span className="caption">{formatDate(project.createdAt)}</span>
      </div>
      <div className="card__title">{project.title}</div>
      <div className="card__desc">{project.description}</div>
      <div className="row row--between">
        <span className="budget">{formatMoney(project.budget, project.currency)}</span>
        <span className="chips">
          {project.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </span>
      </div>
      <div className="row" style={{ gap: 7 }}>
        <Avatar name={project.client.name} src={project.client.avatarUrl} size={22} />
        <span className="caption" style={{ fontWeight: 700, color: 'var(--c-muted)' }}>
          {project.client.name || 'Заказчик'}
        </span>
        {project.client.isVerified && (
          <span style={{ color: 'var(--c-primary)', display: 'inline-flex' }}>
            <VerifiedIcon size={13} />
          </span>
        )}
        {project.client.reviewsCount > 0 && (
          <span className="caption row" style={{ gap: 3, marginLeft: 'auto' }}>
            <span style={{ color: 'var(--c-amber)', display: 'inline-flex' }}>
              <StarIcon size={12} />
            </span>
            {project.client.rating.toFixed(1)}
          </span>
        )}
      </div>
    </Link>
  )
}

'use client'

import { BellIcon, TrashIcon } from './Icons'

// Список сохраненных поисков: нажатие применяет условия к ленте
export default function SubscriptionsSheet({ items, onApply, onToggleMute, onDelete, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
        <span className="sheet__handle" aria-hidden />
        <div className="title-lg">Мои подписки</div>

        {items.length === 0 && (
          <div className="empty" style={{ padding: '28px 12px' }}>
            <span className="empty__icon">
              <BellIcon />
            </span>
            <h3>Подписок пока нет</h3>
            <p className="small">
              Настройте ленту под себя и нажмите «Следить за этим поиском» — будем присылать новые
              проекты.
            </p>
          </div>
        )}

        {items.map((s) => (
          <div key={s.id} className="list-row" style={{ gap: 10 }}>
            <button className="file-main" onClick={() => onApply(s)}>
              <span className="file-name">{s.title}</span>
              <span className="caption">{s.muted ? 'Уведомления приглушены' : 'Уведомления включены'}</span>
            </button>
            <button
              className={`toggle${!s.muted ? ' toggle--on' : ''}`}
              onClick={() => onToggleMute(s)}
              role="switch"
              aria-checked={!s.muted}
              aria-label={`Уведомления по подписке «${s.title}»`}
            >
              <span className="toggle__knob" />
            </button>
            <button
              className="icon-action icon-action--danger"
              onClick={() => onDelete(s)}
              aria-label={`Удалить подписку «${s.title}»`}
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

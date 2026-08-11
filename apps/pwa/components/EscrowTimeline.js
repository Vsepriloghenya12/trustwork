// Фирменная шкала сделки: этапы соответствуют реальным статусам эскроу
const STEPS = [
  { key: 'FUNDED', label: 'Заморожено' },
  { key: 'IN_PROGRESS', label: 'В работе' },
  { key: 'COMPLETED', label: 'Выплачено' },
]

const ORDER = { FUNDED: 0, IN_PROGRESS: 1, COMPLETED: 2 }

export default function EscrowTimeline({ status }) {
  const reached = ORDER[status] ?? -1
  return (
    <div className="timeline">
      {STEPS.map((step, i) => (
        <div key={step.key} className={`timeline__step${i <= reached ? ' timeline__step--done' : ''}`}>
          <span className="timeline__dot" />
          <span className="timeline__label">{step.label}</span>
        </div>
      ))}
    </div>
  )
}

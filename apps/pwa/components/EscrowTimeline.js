// Фирменная шкала сделки: этапы соответствуют реальным статусам эскроу
const STEPS = [
  { key: 'FUNDED', label: 'Заморожено' },
  { key: 'IN_PROGRESS', label: 'В работе' },
  { key: 'ACCEPTED', label: 'Принято' },
  { key: 'COMPLETED', label: 'Выплачено' },
]

// AWAITING_PAYOUT и DISPUTED — это остановка на предпоследнем шаге: работа принята
// или оспорена, но деньги до исполнителя еще не дошли.
const ORDER = {
  FUNDED: 0,
  IN_PROGRESS: 1,
  DISPUTED: 1,
  AWAITING_PAYOUT: 2,
  COMPLETED: 3,
}

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

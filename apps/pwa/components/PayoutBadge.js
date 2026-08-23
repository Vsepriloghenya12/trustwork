import { PAYOUT_STATUS_LABELS } from '@/lib/pricing'

// Статус для выплат виден до найма: заказчик с эскроу выбирает осознанно,
// а исполнитель без статуса видит, что теряет отклики, и оформляет его сам.
export default function PayoutBadge({ status }) {
  if (!status) return null
  const ready = status !== 'NONE'
  return (
    <span className={ready ? 'badge-escrow' : 'chip'} style={{ fontSize: 11.5 }}>
      {PAYOUT_STATUS_LABELS[status]}
    </span>
  )
}

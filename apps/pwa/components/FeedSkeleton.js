// Заглушка списка на время загрузки: экран не прыгает и не мигает пустотой
export default function FeedSkeleton({ count = 3 }) {
  return (
    <div className="list" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton" style={{ width: 128, height: 22, borderRadius: 999 }} />
          <div className="skeleton" style={{ width: '86%', height: 17 }} />
          <div className="skeleton" style={{ width: '64%', height: 14 }} />
          <div className="row row--between" style={{ marginTop: 4 }}>
            <div className="skeleton" style={{ width: 96, height: 20 }} />
            <div className="skeleton" style={{ width: 120, height: 20, borderRadius: 999 }} />
          </div>
          <div className="row" style={{ gap: 8, marginTop: 2 }}>
            <div className="skeleton" style={{ width: 22, height: 22, borderRadius: 999 }} />
            <div className="skeleton" style={{ width: 108, height: 13 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

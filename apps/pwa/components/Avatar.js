import { API_URL } from '@/lib/api'

export default function Avatar({ name, src, size = 40 }) {
  const initials = (name || '•')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  if (src) {
    return (
      <img
        className="avatar avatar--photo"
        src={src.startsWith('http') ? src : `${API_URL}${src}`}
        alt={name ? `Фото: ${name}` : 'Фото профиля'}
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials}
    </span>
  )
}

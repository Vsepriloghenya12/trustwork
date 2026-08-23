const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const LockIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <rect x="4" y="11" width="16" height="10" rx="3" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

export const StarIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
    <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z" />
  </svg>
)

export const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.6} aria-hidden>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
)

export const VerifiedIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
    <path d="M12 1.8l2.4 2.1 3.2-.4 1.1 3 3 1.1-.4 3.2 2.1 2.4-2.1 2.4.4 3.2-3 1.1-1.1 3-3.2-.4-2.4 2.1-2.4-2.1-3.2.4-1.1-3-3-1.1.4-3.2L.6 13.2l2.1-2.4-.4-3.2 3-1.1 1.1-3 3.2.4L12 1.8z" />
    <path d="M8.2 12.4l2.6 2.6 5-5.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const BellIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
    <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
  </svg>
)

export const FeedIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <rect x="3.5" y="4" width="17" height="7" rx="2.5" />
    <rect x="3.5" y="14.5" width="17" height="5.5" rx="2.5" />
  </svg>
)

export const SearchIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
)

export const ChatIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <path d="M4.5 4h15A1.5 1.5 0 0 1 21 5.5v9a1.5 1.5 0 0 1-1.5 1.5H12l-4.6 3.4V16H4.5A1.5 1.5 0 0 1 3 14.5v-9A1.5 1.5 0 0 1 4.5 4z" />
  </svg>
)

export const UserIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </svg>
)

export const SendIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <path d="M21 3L10.5 13.5" />
    <path d="M21 3l-6.8 18-3.7-7.5L3 9.8 21 3z" />
  </svg>
)

export const BackIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.2} aria-hidden>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export const PlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.4} aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

// --- Направления работ ---

export const BrushIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <path d="M15.5 3.5l5 5-8.4 8.4a3 3 0 0 1-1.5.8l-4.3.9.9-4.3a3 3 0 0 1 .8-1.5l7.5-7.5z" />
    <path d="M5 17c-1.2 1.2-1 4-1 4s2.8.2 4-1" />
  </svg>
)

export const CodeIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <path d="M8.5 8L4 12l4.5 4M15.5 8l4.5 4-4.5 4M13.5 5l-3 14" />
  </svg>
)

export const TextIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <path d="M5 6.5h14M5 12h9M5 17.5h11" />
  </svg>
)

export const MegaphoneIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <path d="M4 10v4a2 2 0 0 0 2 2h1l9 4V4l-9 4H6a2 2 0 0 0-2 2z" />
    <path d="M19 9.5a3.5 3.5 0 0 1 0 5" />
  </svg>
)

export const VideoIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <rect x="3" y="6" width="12" height="12" rx="3" />
    <path d="M15 11l5.5-3v8L15 13z" />
  </svg>
)

export const GridIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2.2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2.2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2.2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2.2" />
  </svg>
)

export const TrashIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <path d="M4 7h16M10 4.5h4M6.5 7l.8 12.2a1.8 1.8 0 0 0 1.8 1.8h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
  </svg>
)

export const CameraIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.1} aria-hidden>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1.2-2h7.2l1.2 2h1.7A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9z" />
    <circle cx="12" cy="13" r="3.6" />
  </svg>
)

export const FileIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
    <path d="M14 3v5h5" />
  </svg>
)

export const ShieldIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <path d="M12 2.5l7.5 3v6c0 4.8-3.2 8.6-7.5 10-4.3-1.4-7.5-5.2-7.5-10v-6l7.5-3z" />
    <path d="M8.8 12l2.3 2.3 4.1-4.3" />
  </svg>
)

export const ChevronIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.2} aria-hidden>
    <path d="M9 5l7 7-7 7" />
  </svg>
)

export const CalendarIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <rect x="3.5" y="5" width="17" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </svg>
)

export const FilterIcon = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <path d="M4 6.5h16M7 12h10M10.5 17.5h3" />
  </svg>
)

export const BookmarkIcon = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden>
    <path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1z" />
  </svg>
)

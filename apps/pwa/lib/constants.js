// Тарифы платформы живут в lib/pricing.js — там же, где расчет комиссий.

export const CATEGORIES = ['дизайн', 'разработка', 'тексты', 'маркетинг', 'видео']

export const BUDGET_PRESETS = [10000, 25000, 50000, 100000]

export const DEADLINE_PRESETS = [
  { key: '7', label: 'До недели', days: 7 },
  { key: '14', label: '2 недели', days: 14 },
  { key: '30', label: 'Месяц', days: 30 },
  { key: 'custom', label: 'Свой срок', days: null },
]

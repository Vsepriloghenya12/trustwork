// Закрытый контур: скрываем контакты в переписке (PROJECT_SPEC.md, раздел 6.4).
// Известное ограничение MVP: длинные числовые диапазоны («1 000 000 - 2 000 000»)
// могут ложно сработать как телефон.
const REPLACEMENT = '[скрыто]'

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/g
const LINK_RE = /(?:https?:\/\/)?(?:t\.me|telegram\.me|wa\.me|vk\.com|instagram\.com)\/\S+/gi
const MENTION_RE = /@[a-zA-Z0-9_]{3,}/g
// Кандидат: 10+ цифр с учетом разделителей — похоже на номер телефона
const PHONE_CANDIDATE_RE = /\+?\d[\d\s\-().]{8,}\d/g

export function maskContacts(text) {
  const masked = text
    .replace(EMAIL_RE, REPLACEMENT)
    .replace(LINK_RE, REPLACEMENT)
    .replace(MENTION_RE, REPLACEMENT)
    .replace(PHONE_CANDIDATE_RE, (match) => {
      const digits = match.replace(/\D/g, '')
      return digits.length >= 10 ? REPLACEMENT : match
    })
  return { text: masked, wasMasked: masked !== text }
}

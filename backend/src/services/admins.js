// Владельцы платформы задаются переменной ADMIN_PHONES: при входе такой аккаунт
// получает доступ к странице владельца. Формат: +79001234567,+79001234568
export function adminPhones() {
  return (process.env.ADMIN_PHONES || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
}

export function isAdminPhone(phone) {
  return adminPhones().includes(phone)
}

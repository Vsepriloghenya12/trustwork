// Закрытый контур: телефон наружу не отдаем, он есть только в privateUser (свой профиль)
export function publicUser(u) {
  return {
    id: u.id,
    // Метка времени в ссылке заставляет браузер обновить кэш после смены фото
    avatarUrl: u.avatarAt ? `/api/users/${u.id}/avatar?v=${u.avatarAt.getTime()}` : null,
    role: u.role,
    name: u.name,
    bio: u.bio,
    skills: u.skills,
    rating: u.rating,
    reviewsCount: u.reviewsCount,
    completedDeals: u.completedDeals,
    social: u.social,
    isVerified: u.isVerified,
    createdAt: u.createdAt,
  }
}

export function privateUser(u) {
  return { ...publicUser(u), phone: u.phone, isAdmin: u.isAdmin }
}

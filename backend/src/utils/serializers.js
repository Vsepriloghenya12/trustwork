// Закрытый контур: телефон наружу не отдаем, он есть только в privateUser (свой профиль)
export function publicUser(u) {
  return {
    id: u.id,
    role: u.role,
    name: u.name,
    bio: u.bio,
    skills: u.skills,
    rating: u.rating,
    reviewsCount: u.reviewsCount,
    completedDeals: u.completedDeals,
    telegram: u.telegram,
    github: u.github,
    isVerified: u.isVerified,
    createdAt: u.createdAt,
  }
}

export function privateUser(u) {
  return { ...publicUser(u), phone: u.phone }
}

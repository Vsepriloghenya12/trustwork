# TrustWork

Фриланс-платформа без платных откликов, с автоматической защитой оплаты (эскроу) и прозрачной системой доверия. Полная концепция — в [PROJECT_SPEC.md](PROJECT_SPEC.md).

## Структура репозитория

```
PROJECT_SPEC.md   — спецификация продукта (постоянный контекст для ИИ)
backend/          — API: Node.js (Express 5) + Prisma + PostgreSQL
apps/             — (позже) Android-приложение и PWA
```

## Backend: локальный запуск

```bash
cd backend
npm install
cp .env.example .env   # прописать DATABASE_URL
npx prisma migrate deploy
npm run dev
```

Проверка: `GET http://localhost:3000/health` → `{"ok":true,"service":"trustwork-api"}`.

Тесты (без БД, чистая логика эскроу/платежей/модерации):

```bash
cd backend && npm test
```

## Деплой на Railway

1. Создать проект на [railway.app](https://railway.app), добавить сервис **PostgreSQL**.
2. Добавить сервис из GitHub-репозитория, в настройках сервиса указать **Root Directory** = `backend`.
3. Переменные окружения сервиса:
   - `DATABASE_URL` — сослаться на переменную Postgres (`${{Postgres.DATABASE_URL}}`);
   - `JWT_SECRET` — случайная строка (32+ символов);
   - `NODE_ENV` = `production`.
4. **Start Command**: `npm run deploy` (применяет миграции и стартует сервер).

## API (MVP)

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/auth/request-code` | Запросить SMS-код по номеру телефона |
| POST | `/api/auth/verify` | Подтвердить код → JWT-токен |
| GET/PATCH | `/api/users/me` | Свой профиль (имя, роль, навыки, Telegram/GitHub) |
| GET | `/api/users/:id` | Публичный профиль |
| GET | `/api/projects` | Лента (только проекты с эскроу; фильтры `tag`, `search`) |
| POST | `/api/projects` | Создать проект (статус DRAFT) |
| GET | `/api/projects/mine` | Мои проекты (как заказчик и как исполнитель) |
| POST | `/api/projects/:id/fund` | Заморозить бюджет в эскроу → проект попадает в ленту |
| POST | `/api/projects/:id/applications` | «Предложить себя» (питч) |
| GET | `/api/projects/:id/applications` | Отклики на проект (для заказчика) |
| POST | `/api/applications/:id/accept` | Выбрать исполнителя → проект в работе |
| POST | `/api/applications/:id/reject` | Отклонить отклик |
| GET | `/api/applications/mine` | Мои отклики (для фрилансера) |
| POST | `/api/projects/:id/complete` | Принять работу → выплата из эскроу |
| POST | `/api/projects/:id/cancel` | Отменить проект → возврат средств |
| GET/POST | `/api/projects/:id/messages` | Чат сделки (контакты скрываются автоматически) |

Авторизация: заголовок `Authorization: Bearer <token>`.

В dev-режиме (`NODE_ENV != production`) SMS не отправляется — код возвращается в поле `devCode` ответа `/api/auth/request-code`.

## Что дальше (дорожная карта)

- [x] Спецификация, репозиторий
- [x] Prisma-схема (User, Project, Application, Transaction, Message)
- [x] API: авторизация по телефону, проекты, эскроу (мок-провайдер), отклики, чат с модерацией
- [ ] Railway + PostgreSQL, первый деплой
- [ ] Подключение реального платежного провайдера (ЮKassa/Stripe)
- [ ] Android-приложение (React Native / Expo)
- [ ] PWA для iOS (Next.js)

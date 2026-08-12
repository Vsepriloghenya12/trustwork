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
| GET | `/api/projects` | Лента: OPEN + FUNDED, проекты с эскроу выше (фильтры `tag`, `search`) |
| POST | `/api/projects` | Создать проект (статус DRAFT) |
| GET | `/api/projects/mine` | Мои проекты (как заказчик и как исполнитель) |
| POST | `/api/projects/:id/publish` | Опубликовать без эскроу (статус OPEN) |
| POST | `/api/projects/:id/fund` | Заморозить бюджет в эскроу (бейдж + приоритет в ленте) |
| POST | `/api/projects/:id/applications` | «Предложить себя» (питч) |
| GET | `/api/projects/:id/applications` | Отклики на проект (для заказчика) |
| POST | `/api/applications/:id/accept` | Выбрать исполнителя → проект в работе |
| POST | `/api/applications/:id/reject` | Отклонить отклик |
| GET | `/api/applications/mine` | Мои отклики (для фрилансера) |
| POST | `/api/projects/:id/complete` | Принять работу → выплата из эскроу |
| POST | `/api/projects/:id/cancel` | Отменить проект → возврат средств |
| GET/POST | `/api/projects/:id/messages` | Чат сделки (контакты скрываются; открытие отмечает прочитанным) |
| POST | `/api/projects/:id/reviews` | Оценка: фрилансер → заказчик (теги/звезды), заказчик → исполнитель (звезды) |
| GET | `/api/users/:id/reviews` | Отзывы о пользователе: сводка тегов + список |
| GET | `/api/users/me/unread` | Счетчики непрочитанных сообщений |
| POST | `/api/payments/yookassa/webhook` | Вебхук ЮKassa (подтверждение холда) |

Авторизация: заголовок `Authorization: Bearer <token>`.

В dev-режиме (`NODE_ENV != production`) SMS не отправляется — код возвращается в поле `devCode` ответа `/api/auth/request-code`.

## Что дальше (дорожная карта)

- [x] Спецификация, репозиторий
- [x] Prisma-схема (User, Project, Application, Transaction, Message, Review)
- [x] API: авторизация по телефону, проекты, эскроу (опционален), отклики, чат с модерацией, двусторонние отзывы
- [x] Railway + PostgreSQL, деплой (backend + PWA)
- [x] PWA (Next.js): лента, проекты, питчи, чаты с бейджами непрочитанного, профили
- [x] Адаптер SMS.ru (включается `SMS_PROVIDER=sms_ru` + `SMSRU_API_KEY`)
- [x] Адаптер ЮKassa (включается `PAYMENT_PROVIDER=yookassa` + ключи магазина; требует боевого теста на малых суммах)
- [ ] Боевое включение SMS и платежей (нужны ключи владельца)
- [ ] Android-приложение (React Native / Expo)

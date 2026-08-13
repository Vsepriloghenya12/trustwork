-- Фото профиля: небольшое изображение хранится рядом с пользователем
ALTER TABLE "User" ADD COLUMN "avatarData" BYTEA;
ALTER TABLE "User" ADD COLUMN "avatarMime" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarAt" TIMESTAMP(3);

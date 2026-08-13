-- Вместо отдельных Telegram и GitHub — одна ссылка на соцсеть или портфолио
ALTER TABLE "User" RENAME COLUMN "telegram" TO "social";

ALTER TABLE "User" DROP COLUMN "github";

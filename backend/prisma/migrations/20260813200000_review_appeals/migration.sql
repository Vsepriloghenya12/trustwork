-- Скрытие отзыва по итогам обжалования
ALTER TABLE "Review" ADD COLUMN "hiddenAt" TIMESTAMP(3);

CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- Обжалование отзыва тем, о ком он написан
CREATE TABLE "ReviewAppeal" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewAppeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewAppeal_status_createdAt_idx" ON "ReviewAppeal"("status", "createdAt");

CREATE INDEX "ReviewAppeal_reviewId_idx" ON "ReviewAppeal"("reviewId");

ALTER TABLE "ReviewAppeal" ADD CONSTRAINT "ReviewAppeal_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewAppeal" ADD CONSTRAINT "ReviewAppeal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

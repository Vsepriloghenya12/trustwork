-- Эскроу становится опциональным: публикация без заморозки (статус OPEN).
-- Значение дописывается в конец enum; в ленте FUNDED сортируется раньше OPEN.
ALTER TYPE "ProjectStatus" ADD VALUE 'OPEN';

-- Рейтинг заказчика: отзывы фрилансеров после диалога (DIALOG) или сделки (DEAL)
CREATE TYPE "ReviewKind" AS ENUM ('DIALOG', 'DEAL');

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "kind" "ReviewKind" NOT NULL,
    "rating" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "comment" TEXT,
    "projectId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_projectId_authorId_key" ON "Review"("projectId", "authorId");

CREATE INDEX "Review_clientId_kind_idx" ON "Review"("clientId", "kind");

ALTER TABLE "Review" ADD CONSTRAINT "Review_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review" ADD CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

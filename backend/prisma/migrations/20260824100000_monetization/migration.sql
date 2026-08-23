-- Новые статусы. ALTER TYPE ADD VALUE дописывает значения в конец типа,
-- поэтому сортировка ленты по status их не задевает.
-- Новые значения нельзя использовать в этой же транзакции — только объявить.
ALTER TYPE "ProjectStatus" ADD VALUE 'AWAITING_PAYOUT';
ALTER TYPE "ProjectStatus" ADD VALUE 'DISPUTED';

ALTER TYPE "NotificationKind" ADD VALUE 'PAYOUT_STATUS_REQUIRED';
ALTER TYPE "NotificationKind" ADD VALUE 'PAYOUT_SENT';
ALTER TYPE "NotificationKind" ADD VALUE 'CANCEL_REQUESTED';
ALTER TYPE "NotificationKind" ADD VALUE 'DISPUTE_OPENED';
ALTER TYPE "NotificationKind" ADD VALUE 'DISPUTE_RESOLVED';
ALTER TYPE "NotificationKind" ADD VALUE 'FEE_REFUNDED';

CREATE TYPE "PayoutStatus" AS ENUM ('NONE', 'SELF_EMPLOYED', 'ENTREPRENEUR');
CREATE TYPE "TransactionKind" AS ENUM ('ESCROW', 'FEE');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'IN_SUPPORT', 'RESOLVED');

-- Кому платформа вправе перечислить деньги
ALTER TABLE "User" ADD COLUMN "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "User" ADD COLUMN "payoutStatusAt" TIMESTAMP(3);

-- Деньги и вехи сделки
ALTER TABLE "Project" ADD COLUMN "feePaid" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "payoutDueAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "cancelRequestedById" TEXT;
ALTER TABLE "Project" ADD COLUMN "cancelRequestedAt" TIMESTAMP(3);
CREATE INDEX "Project_status_payoutDueAt_idx" ON "Project"("status", "payoutDueAt");

-- Уже опубликованным проектам проставляем дату публикации: от нее считается
-- возврат комиссии, если за неделю не пришло ни одного отклика.
UPDATE "Project" SET "publishedAt" = "createdAt" WHERE "status" IN ('OPEN', 'FUNDED');
UPDATE "Project" SET "startedAt" = "updatedAt" WHERE "status" = 'IN_PROGRESS';

ALTER TABLE "Transaction" ADD COLUMN "kind" "TransactionKind" NOT NULL DEFAULT 'ESCROW';

-- Спор по сделке
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "supportAt" TIMESTAMP(3) NOT NULL,
    "payoutToFreelancer" INTEGER,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Dispute_status_supportAt_idx" ON "Dispute"("status", "supportAt");
CREATE INDEX "Dispute_projectId_idx" ON "Dispute"("projectId");
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Общий выключатель push-уведомлений
ALTER TABLE "User" ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "NotificationKind" AS ENUM (
  'PROJECT_MATCH', 'PROJECT_ESCROW', 'INVITATION', 'APPLICATION_NEW',
  'APPLICATION_ACCEPTED', 'PROJECT_COMPLETED', 'SUPPORT_REPLY', 'APPEAL_RESOLVED', 'MESSAGE'
);

CREATE TYPE "InvitationStatus" AS ENUM ('SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- Сохраненный поиск
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tag" TEXT,
    "search" TEXT,
    "minBudget" INTEGER,
    "escrowOnly" BOOLEAN NOT NULL DEFAULT false,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Subscription_userId_createdAt_idx" ON "Subscription"("userId", "createdAt");
CREATE INDEX "Subscription_muted_idx" ON "Subscription"("muted");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "projectId" TEXT,
    "subscriptionId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Устройство, подписанное на push
CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushDevice_endpoint_key" ON "PushDevice"("endpoint");
CREATE INDEX "PushDevice_userId_idx" ON "PushDevice"("userId");
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Приглашение в проект
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'SENT',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invitation_projectId_freelancerId_key" ON "Invitation"("projectId", "freelancerId");
CREATE INDEX "Invitation_freelancerId_status_idx" ON "Invitation"("freelancerId", "status");
CREATE INDEX "Invitation_projectId_status_idx" ON "Invitation"("projectId", "status");
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

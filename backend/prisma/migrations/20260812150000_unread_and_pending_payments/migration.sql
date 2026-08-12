-- Прочитанность сообщений: счетчики непрочитанного в чатах
ALTER TABLE "Message" ADD COLUMN "readAt" TIMESTAMP(3);

CREATE INDEX "Message_recipientId_readAt_idx" ON "Message"("recipientId", "readAt");

-- Платеж, ожидающий подтверждения пользователем (redirect-флоу ЮKassa)
ALTER TYPE "TransactionStatus" ADD VALUE 'PENDING';

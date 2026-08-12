-- Отзывы становятся двусторонними: субъект оценки — любой участник сделки.
-- Заказчик оценивает исполнителя после завершения сделки (звезды),
-- фрилансер оценивает заказчика после диалога (теги) или сделки (звезды).
ALTER TABLE "Review" RENAME COLUMN "clientId" TO "subjectId";

ALTER TABLE "Review" RENAME CONSTRAINT "Review_clientId_fkey" TO "Review_subjectId_fkey";

ALTER INDEX "Review_clientId_kind_idx" RENAME TO "Review_subjectId_kind_idx";

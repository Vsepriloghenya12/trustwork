-- Вложения к задаче: ТЗ и примеры. Видимость выбирает заказчик:
-- PUBLIC — открыть может любой, APPLICANTS — только откликнувшиеся.
CREATE TYPE "FileVisibility" AS ENUM ('PUBLIC', 'APPLICANTS');

CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "visibility" "FileVisibility" NOT NULL DEFAULT 'PUBLIC',
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectFile_projectId_idx" ON "ProjectFile"("projectId");

ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

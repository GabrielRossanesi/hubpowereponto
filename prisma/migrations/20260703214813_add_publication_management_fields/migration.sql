-- AlterTable
ALTER TABLE "publication" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT,
ADD COLUMN     "channels" JSONB;

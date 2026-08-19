-- AlterEnum
ALTER TYPE "KycAuditEventType" ADD VALUE 'SANCTIONS_SCREENING';

-- AlterTable
ALTER TABLE "kyc_profiles" ADD COLUMN     "sanctionsClearedAt" TIMESTAMP(3),
ADD COLUMN     "sanctionsFlaggedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "sanctions_list_entries" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "program" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sanctions_list_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sanctions_list_entries_source_idx" ON "sanctions_list_entries"("source");

-- CreateIndex
CREATE UNIQUE INDEX "sanctions_list_entries_source_externalId_key" ON "sanctions_list_entries"("source", "externalId");

-- CreateIndex
CREATE INDEX "kyc_profiles_sanctionsFlaggedAt_sanctionsClearedAt_idx" ON "kyc_profiles"("sanctionsFlaggedAt", "sanctionsClearedAt");

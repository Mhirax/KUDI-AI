-- CreateEnum
CREATE TYPE "KycAuditEventType" AS ENUM ('VERIFICATION_ATTEMPT', 'TIER_CHANGE');

-- CreateEnum
CREATE TYPE "KycAuditOutcome" AS ENUM ('PASSED', 'FAILED');

-- CreateTable
CREATE TABLE "kyc_audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kycProfileId" TEXT NOT NULL,
    "eventType" "KycAuditEventType" NOT NULL,
    "verificationType" TEXT,
    "outcome" "KycAuditOutcome",
    "failureReason" TEXT,
    "previousTier" "KycTier",
    "newTier" "KycTier",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kyc_audit_log_userId_idx" ON "kyc_audit_log"("userId");

-- CreateIndex
CREATE INDEX "kyc_audit_log_kycProfileId_idx" ON "kyc_audit_log"("kycProfileId");

-- CreateTable
CREATE TABLE "kyc_tier_limits" (
    "tier" "KycTier" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "perTransactionLimit" BIGINT,
    "dailyTransferLimit" BIGINT,
    "maxBalance" BIGINT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_tier_limits_pkey" PRIMARY KEY ("tier")
);

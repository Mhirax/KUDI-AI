-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'SUPPORT_AGENT', 'COMPLIANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('WALLET', 'SAVINGS', 'CURRENT');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DORMANT', 'FROZEN', 'CLOSED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KycTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "EntryDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('TRANSFER', 'DEPOSIT', 'BILL_PAYMENT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "DepositChannel" AS ENUM ('VIRTUAL_ACCOUNT', 'CHECKOUT');

-- CreateEnum
CREATE TYPE "BillCategory" AS ENUM ('AIRTIME', 'MOBILE_DATA', 'ELECTRICITY', 'CABLE_TV', 'INTERNET');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SECURITY', 'TRANSACTION', 'KYC', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "SavingsGoalStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED', 'REPAYING', 'REPAID', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('VIRTUAL', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('PENDING', 'ACTIVE', 'FROZEN', 'TERMINATED');

-- CreateEnum
CREATE TYPE "RewardTransactionType" AS ENUM ('EARNED', 'REDEEMED', 'REFERRAL_BONUS');

-- CreateEnum
CREATE TYPE "RewardTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "TransferType" NOT NULL,
    "initiatorUserId" TEXT NOT NULL,
    "sourceAccountId" TEXT NOT NULL,
    "destinationAccountId" TEXT,
    "recipientBankCode" TEXT,
    "recipientAccountNumber" TEXT,
    "recipientAccountName" TEXT,
    "amountMinorUnits" BIGINT NOT NULL,
    "feeMinorUnits" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "narration" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "providerReference" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "KycTier" NOT NULL DEFAULT 'TIER_1',
    "bvnVerifiedAt" TIMESTAMP(3),
    "bvnHash" TEXT,
    "bvnMasked" TEXT,
    "ninVerifiedAt" TIMESTAMP(3),
    "ninHash" TEXT,
    "ninMasked" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "EntryDirection" NOT NULL,
    "amountMinorUnits" BIGINT NOT NULL,
    "balanceAfterMinorUnits" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "reference" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "channel" "DepositChannel" NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amountMinorUnits" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "providerTransactionId" TEXT,
    "failureReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "virtualAccountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "providerReference" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "virtual_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_payments" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "category" "BillCategory" NOT NULL,
    "billerCode" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "billerName" TEXT NOT NULL,
    "customerIdentifier" TEXT NOT NULL,
    "amountMinorUnits" BIGINT NOT NULL,
    "feeMinorUnits" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "providerReference" TEXT,
    "valueToken" TEXT,
    "failureReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "reference" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savingsAccountId" TEXT NOT NULL,
    "sourceAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmountMinorUnits" BIGINT,
    "currency" TEXT NOT NULL,
    "status" "SavingsGoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "principalMinorUnits" BIGINT NOT NULL,
    "feeMinorUnits" BIGINT NOT NULL,
    "totalRepayableMinorUnits" BIGINT NOT NULL,
    "amountRepaidMinorUnits" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "tenorDays" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "dueDate" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "rejectionReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "CardType" NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'PENDING',
    "providerCardId" TEXT,
    "last4" TEXT,
    "expiryMonth" TEXT,
    "expiryYear" TEXT,
    "brand" TEXT,
    "balanceMinorUnits" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalRedeemed" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RewardTransactionType" NOT NULL,
    "status" "RewardTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "sourceReference" TEXT,
    "redemptionType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_redemptions" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "refereeUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_accountNumber_key" ON "accounts"("accountNumber");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "accounts_status_idx" ON "accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_reference_key" ON "transfers"("reference");

-- CreateIndex
CREATE INDEX "transfers_initiatorUserId_idx" ON "transfers"("initiatorUserId");

-- CreateIndex
CREATE INDEX "transfers_sourceAccountId_idx" ON "transfers"("sourceAccountId");

-- CreateIndex
CREATE INDEX "transfers_providerReference_idx" ON "transfers"("providerReference");

-- CreateIndex
CREATE INDEX "transfers_status_idx" ON "transfers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_profiles_userId_key" ON "kyc_profiles"("userId");

-- CreateIndex
CREATE INDEX "kyc_profiles_tier_idx" ON "kyc_profiles"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_sourceEventId_key" ON "ledger_entries"("sourceEventId");

-- CreateIndex
CREATE INDEX "ledger_entries_accountId_occurredAt_idx" ON "ledger_entries"("accountId", "occurredAt");

-- CreateIndex
CREATE INDEX "ledger_entries_userId_occurredAt_idx" ON "ledger_entries"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "ledger_entries_reference_idx" ON "ledger_entries"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_reference_key" ON "deposits"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_providerTransactionId_key" ON "deposits"("providerTransactionId");

-- CreateIndex
CREATE INDEX "deposits_userId_idx" ON "deposits"("userId");

-- CreateIndex
CREATE INDEX "deposits_accountId_idx" ON "deposits"("accountId");

-- CreateIndex
CREATE INDEX "deposits_status_idx" ON "deposits"("status");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_accounts_accountId_key" ON "virtual_accounts"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_accounts_virtualAccountNumber_key" ON "virtual_accounts"("virtualAccountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_accounts_providerReference_key" ON "virtual_accounts"("providerReference");

-- CreateIndex
CREATE INDEX "virtual_accounts_userId_idx" ON "virtual_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bill_payments_reference_key" ON "bill_payments"("reference");

-- CreateIndex
CREATE INDEX "bill_payments_userId_idx" ON "bill_payments"("userId");

-- CreateIndex
CREATE INDEX "bill_payments_accountId_idx" ON "bill_payments"("accountId");

-- CreateIndex
CREATE INDEX "bill_payments_status_idx" ON "bill_payments"("status");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "savings_goals_savingsAccountId_key" ON "savings_goals"("savingsAccountId");

-- CreateIndex
CREATE INDEX "savings_goals_userId_idx" ON "savings_goals"("userId");

-- CreateIndex
CREATE INDEX "savings_goals_status_idx" ON "savings_goals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "loans_reference_key" ON "loans"("reference");

-- CreateIndex
CREATE INDEX "loans_userId_idx" ON "loans"("userId");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cards_providerCardId_key" ON "cards"("providerCardId");

-- CreateIndex
CREATE INDEX "cards_userId_idx" ON "cards"("userId");

-- CreateIndex
CREATE INDEX "cards_status_idx" ON "cards"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reward_accounts_userId_key" ON "reward_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "reward_accounts_referralCode_key" ON "reward_accounts"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "reward_transactions_sourceEventId_key" ON "reward_transactions"("sourceEventId");

-- CreateIndex
CREATE INDEX "reward_transactions_userId_createdAt_idx" ON "reward_transactions"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "referral_redemptions_refereeUserId_key" ON "referral_redemptions"("refereeUserId");

-- CreateIndex
CREATE INDEX "referral_redemptions_referrerUserId_idx" ON "referral_redemptions"("referrerUserId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

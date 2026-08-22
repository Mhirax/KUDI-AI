-- Curated by hand from `prisma migrate diff` output, scoped narrowly to
-- ledger_entries only — the pre-existing, unrelated 10-table schema
-- drift (bill_payments, cards, deposits, loans, notifications,
-- referral_redemptions, reward_accounts, reward_transactions,
-- savings_goals, virtual_accounts + their enums) is excluded, not
-- touched, same as every prior migration this session.
--
-- ledger_entries already existed live with 2 pre-existing single-sided
-- test rows (test-credit-001, test-debit-001) that don't pair up as a
-- balanced posting. journalId is added as nullable first, backfilled
-- from sourceEventId (already a unique per-row UUID, so each legacy
-- row becomes its own single-row "journal"), then made NOT NULL.

-- AlterTable
ALTER TABLE "ledger_entries" ADD COLUMN "journalId" TEXT;

-- Backfill pre-existing rows
UPDATE "ledger_entries" SET "journalId" = "sourceEventId" WHERE "journalId" IS NULL;

-- AlterTable
ALTER TABLE "ledger_entries" ALTER COLUMN "journalId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ledger_entries_journalId_idx" ON "ledger_entries"("journalId");

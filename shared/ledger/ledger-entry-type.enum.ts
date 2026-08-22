/**
 * Mirrors the Prisma `LedgerEntryType` enum in schema.prisma. Not all
 * values are produced by any caller yet — DEPOSIT/BILL_PAYMENT
 * anticipate Funding/Bills reusing this same table, the same way
 * shared/idempotency anticipates them reusing IdempotencyKey.
 */
export enum LedgerEntryType {
  TRANSFER = 'TRANSFER',
  DEPOSIT = 'DEPOSIT',
  BILL_PAYMENT = 'BILL_PAYMENT',
  ADJUSTMENT = 'ADJUSTMENT',
}

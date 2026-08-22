import { Currency } from '../enums/currency.enum';

/**
 * Well-known synthetic account identifiers for the non-customer side of
 * a ledger posting — fee revenue, funds held pending an external
 * payout's outcome, etc. These are `LedgerEntry.accountId` values only;
 * they deliberately do not correspond to real Accounts-module `Account`
 * rows (no real balance is tracked for them today), the same way
 * `Account.userId` is a plain scalar reference and not a Prisma
 * relation across the Accounts/Identity boundary.
 */
export const SystemLedgerAccount = {
  feeRevenue: (currency: Currency): string => `system:fee-revenue:${currency}`,
  /** Holds a debited-but-not-yet-outcome-confirmed external payout. */
  externalPayoutClearing: (currency: Currency): string =>
    `system:external-payout-clearing:${currency}`,
  /** Where a successfully-settled external payout's principal is relieved to. */
  externalPayoutSettled: (currency: Currency): string =>
    `system:external-payout-settled:${currency}`,
} as const;

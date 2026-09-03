/**
 * The product type of an Account. `WALLET` is Kudi AI Bank's primary,
 * always-on transactional product; `SAVINGS`/`CURRENT` map to
 * traditional bank account products layered on the same ledger
 * mechanics.
 *
 * The `SYSTEM_*` types are Kudi's own accounts rather than a customer's.
 * They exist so every movement has a real account on both sides:
 *
 *   SYSTEM_SETTLEMENT   the float Kudi holds at its payment provider. A
 *                       customer deposit debits it and credits the
 *                       customer, so money entering a wallet comes from
 *                       somewhere instead of being conjured. An outbound
 *                       payout does the reverse.
 *
 *   SYSTEM_FEE_REVENUE  receives transfer fees. Without it a fee was
 *                       debited from the sender and credited to nothing,
 *                       so the books could not balance.
 *
 * One of each per currency, provisioned on first use. They never appear
 * in customer-facing account listings — see isSystemAccountType.
 */
export enum AccountType {
  WALLET = 'WALLET',
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT',
  SYSTEM_SETTLEMENT = 'SYSTEM_SETTLEMENT',
  SYSTEM_FEE_REVENUE = 'SYSTEM_FEE_REVENUE',
}

/** Customer-selectable products — what a client is allowed to open. */
export const CUSTOMER_ACCOUNT_TYPES: readonly AccountType[] = [
  AccountType.WALLET,
  AccountType.SAVINGS,
  AccountType.CURRENT,
] as const;

export const SYSTEM_ACCOUNT_TYPES: readonly AccountType[] = [
  AccountType.SYSTEM_SETTLEMENT,
  AccountType.SYSTEM_FEE_REVENUE,
] as const;

export function isSystemAccountType(type: AccountType): boolean {
  return SYSTEM_ACCOUNT_TYPES.includes(type);
}

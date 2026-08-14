/**
 * The product type of an Account. `WALLET` is Kudi AI Bank's primary,
 * always-on transactional product; `SAVINGS`/`CURRENT` map to
 * traditional bank account products layered on the same ledger
 * mechanics.
 */
export enum AccountType {
  WALLET = 'WALLET',
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT',
}

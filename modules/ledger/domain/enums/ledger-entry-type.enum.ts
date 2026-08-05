/**
 * Business classification of a ledger entry. Derived from the
 * originating event's reference at recording time:
 *
 * - `TRANSFER`   — reference matches the platform's `KUDI-` transfer
 *                  reference format (internal or external transfers,
 *                  including their fee debit which is folded into the
 *                  source account's single debit entry today).
 * - `DEPOSIT`    — reference matches the Funding module's `KUDI-DEP-`
 *                  deposit reference format (money-in).
 * - `BILL_PAYMENT` — reference matches the Bills module's `KUDI-BILL-`
 *                  reference format (airtime/data/utilities).
 * - `ADJUSTMENT` — any other reference: admin-initiated credit/debit
 *                  via the Accounts module's admin endpoints
 *                  (corrections, promotional credits, manual ops).
 *
 * Members are additive, never repurposed, because persisted ledger
 * rows are immutable.
 */
export enum LedgerEntryType {
  TRANSFER = 'TRANSFER',
  DEPOSIT = 'DEPOSIT',
  BILL_PAYMENT = 'BILL_PAYMENT',
  ADJUSTMENT = 'ADJUSTMENT',
}

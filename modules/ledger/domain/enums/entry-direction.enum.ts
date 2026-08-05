/**
 * Direction of a ledger entry relative to the account it belongs to.
 * Every balance mutation is exactly one of the two — there is no
 * "transfer" direction; a transfer is a DEBIT entry on one account and
 * a CREDIT entry on another.
 */
export enum EntryDirection {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

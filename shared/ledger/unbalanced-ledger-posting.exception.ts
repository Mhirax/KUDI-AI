import { DomainException } from '../exceptions/domain.exception';

/**
 * Thrown when a posting's legs don't net to zero per currency —
 * indicates a caller bug, never a valid business state. Should never
 * actually surface outside of a programming error, but this is money;
 * fail loudly rather than silently write an unbalanced journal.
 */
export class UnbalancedLedgerPostingException extends DomainException {
  constructor(reference: string) {
    super(
      `Ledger posting for reference "${reference}" does not balance — debits must equal credits per currency`,
      'UNBALANCED_LEDGER_POSTING',
    );
    this.name = 'UnbalancedLedgerPostingException';
  }
}

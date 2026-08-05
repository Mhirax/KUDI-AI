import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class LedgerEntryNotFoundException extends DomainException {
  public override readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(entryId: string) {
    super(`Ledger entry ${entryId} not found`, 'LEDGER_ENTRY_NOT_FOUND');
  }
}

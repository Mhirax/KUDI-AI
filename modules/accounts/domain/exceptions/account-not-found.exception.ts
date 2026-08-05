import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class AccountNotFoundException extends DomainException {
  public readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(identifier: string) {
    super(`Account not found: ${identifier}`, 'ACCOUNT_NOT_FOUND');
    this.name = 'AccountNotFoundException';
  }
}

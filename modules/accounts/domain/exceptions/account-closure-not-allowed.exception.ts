import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class AccountClosureNotAllowedException extends DomainException {
  public readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(accountId: string, reason: string) {
    super(`Account ${accountId} cannot be closed: ${reason}`, 'ACCOUNT_CLOSURE_NOT_ALLOWED');
    this.name = 'AccountClosureNotAllowedException';
  }
}

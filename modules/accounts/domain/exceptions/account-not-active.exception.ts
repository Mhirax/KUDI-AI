import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Raised when a credit/debit is attempted against an account that is
 * not in an operable state (frozen, closed, or dormant).
 */
export class AccountNotActiveException extends DomainException {
  public readonly httpStatus = HttpStatus.FORBIDDEN;

  constructor(accountId: string, status: string) {
    super(`Account ${accountId} is not active (current status: ${status})`, 'ACCOUNT_NOT_ACTIVE');
    this.name = 'AccountNotActiveException';
  }
}

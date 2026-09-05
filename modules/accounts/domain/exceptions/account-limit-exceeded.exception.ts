import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class AccountLimitExceededException extends DomainException {
  public readonly httpStatus = HttpStatus.CONFLICT;

  constructor(userId: string, limit: number) {
    super(
      `User ${userId} already holds the maximum of ${limit} accounts`,
      'ACCOUNT_LIMIT_EXCEEDED',
    );
    this.name = 'AccountLimitExceededException';
  }
}

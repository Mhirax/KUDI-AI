import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class SanctionsFlagNotOpenException extends DomainException {
  public readonly httpStatus = HttpStatus.CONFLICT;

  constructor(userId: string) {
    super(`User ${userId} has no open sanctions flag to clear`, 'SANCTIONS_FLAG_NOT_OPEN');
    this.name = 'SanctionsFlagNotOpenException';
  }
}

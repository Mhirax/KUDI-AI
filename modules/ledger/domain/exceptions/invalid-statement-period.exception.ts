import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class InvalidStatementPeriodException extends DomainException {
  public override readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(reason: string) {
    super(`Invalid statement period: ${reason}`, 'INVALID_STATEMENT_PERIOD');
  }
}

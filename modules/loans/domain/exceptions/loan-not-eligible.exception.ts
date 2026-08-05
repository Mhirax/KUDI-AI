import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class LoanNotEligibleException extends DomainException {
  public override readonly httpStatus = HttpStatus.FORBIDDEN;

  constructor(reason: string) {
    super(`Not eligible for a loan: ${reason}`, 'LOAN_NOT_ELIGIBLE');
  }
}

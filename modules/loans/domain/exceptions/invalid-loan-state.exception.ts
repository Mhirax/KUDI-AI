import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class InvalidLoanStateException extends DomainException {
  public override readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(loanId: string, attempted: string, current: string) {
    super(`Cannot ${attempted} loan ${loanId} in status ${current}`, 'INVALID_LOAN_STATE');
  }
}

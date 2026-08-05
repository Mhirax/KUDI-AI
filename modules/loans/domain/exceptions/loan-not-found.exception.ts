import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class LoanNotFoundException extends DomainException {
  public override readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(identifier: string) {
    super(`Loan ${identifier} not found`, 'LOAN_NOT_FOUND');
  }
}

import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class LoanAmountExceedsLimitException extends DomainException {
  public override readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(requested: string, max: string) {
    super(
      `Requested amount ${requested} exceeds the maximum ${max} available for your KYC tier`,
      'LOAN_AMOUNT_EXCEEDS_LIMIT',
    );
  }
}

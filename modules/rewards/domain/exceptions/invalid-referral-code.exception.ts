import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class InvalidReferralCodeException extends DomainException {
  public override readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(code: string) {
    super(`Referral code ${code} is invalid`, 'INVALID_REFERRAL_CODE');
  }
}

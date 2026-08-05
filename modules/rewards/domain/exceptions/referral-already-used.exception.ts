import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class ReferralAlreadyUsedException extends DomainException {
  public override readonly httpStatus = HttpStatus.CONFLICT;

  constructor(userId: string) {
    super(`User ${userId} has already redeemed a referral code`, 'REFERRAL_ALREADY_USED');
  }
}

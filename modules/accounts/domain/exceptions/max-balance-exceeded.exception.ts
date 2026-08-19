import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';
import { KycTier } from '../../../compliance/domain/enums/kyc-tier.enum';

export class MaxBalanceExceededException extends DomainException {
  public readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(tier: KycTier) {
    super(
      `This credit would exceed the maximum balance allowed for your current verification level (${tier}). Upgrade your verification to hold more.`,
      'MAX_BALANCE_EXCEEDED',
    );
    this.name = 'MaxBalanceExceededException';
  }
}

import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';
import { KycTier } from '../../../compliance/domain/enums/kyc-tier.enum';

export type TransferLimitType = 'per-transaction' | 'daily';

export class TransferLimitExceededException extends DomainException {
  public readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(limitType: TransferLimitType, tier: KycTier) {
    super(
      `This transfer exceeds your ${limitType} limit for your current verification level (${tier}). Upgrade your verification to send more.`,
      'TRANSFER_LIMIT_EXCEEDED',
    );
    this.name = 'TransferLimitExceededException';
  }
}

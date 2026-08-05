import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class KycProfileNotFoundException extends DomainException {
  public readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(userId: string) {
    super(`KYC profile not found for user: ${userId}`, 'KYC_PROFILE_NOT_FOUND');
    this.name = 'KycProfileNotFoundException';
  }
}

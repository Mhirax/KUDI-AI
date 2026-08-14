import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class VerificationProviderException extends DomainException {
  public readonly httpStatus = HttpStatus.BAD_GATEWAY;

  constructor(providerMessage: string) {
    super(`Verification provider error: ${providerMessage}`, 'VERIFICATION_PROVIDER_ERROR');
    this.name = 'VerificationProviderException';
  }
}

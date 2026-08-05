import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class FundingProviderException extends DomainException {
  public override readonly httpStatus = HttpStatus.BAD_GATEWAY;

  constructor(message: string) {
    super(`Funding provider error: ${message}`, 'FUNDING_PROVIDER_ERROR');
  }
}

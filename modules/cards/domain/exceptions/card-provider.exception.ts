import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class CardProviderException extends DomainException {
  public override readonly httpStatus = HttpStatus.BAD_GATEWAY;

  constructor(message: string) {
    super(`Card provider error: ${message}`, 'CARD_PROVIDER_ERROR');
  }
}

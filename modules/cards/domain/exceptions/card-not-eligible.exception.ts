import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class CardNotEligibleException extends DomainException {
  public override readonly httpStatus = HttpStatus.FORBIDDEN;

  constructor(reason: string) {
    super(`Not eligible for a card: ${reason}`, 'CARD_NOT_ELIGIBLE');
  }
}

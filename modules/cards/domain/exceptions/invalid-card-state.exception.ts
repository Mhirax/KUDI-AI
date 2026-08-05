import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class InvalidCardStateException extends DomainException {
  public override readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(cardId: string, attempted: string, current: string) {
    super(`Cannot ${attempted} card ${cardId} in status ${current}`, 'INVALID_CARD_STATE');
  }
}

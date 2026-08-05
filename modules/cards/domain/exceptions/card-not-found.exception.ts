import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class CardNotFoundException extends DomainException {
  public override readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(identifier: string) {
    super(`Card ${identifier} not found`, 'CARD_NOT_FOUND');
  }
}

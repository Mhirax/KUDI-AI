import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class UnauthorizedTransferException extends DomainException {
  public readonly httpStatus = HttpStatus.FORBIDDEN;

  constructor() {
    super('You may only initiate transfers from accounts you own', 'UNAUTHORIZED_TRANSFER');
    this.name = 'UnauthorizedTransferException';
  }
}

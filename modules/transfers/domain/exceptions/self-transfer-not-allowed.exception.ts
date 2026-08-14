import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class SelfTransferNotAllowedException extends DomainException {
  public readonly httpStatus = HttpStatus.BAD_REQUEST;

  constructor() {
    super('Source and destination accounts cannot be the same', 'SELF_TRANSFER_NOT_ALLOWED');
    this.name = 'SelfTransferNotAllowedException';
  }
}

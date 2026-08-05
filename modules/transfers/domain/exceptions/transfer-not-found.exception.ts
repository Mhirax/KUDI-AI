import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class TransferNotFoundException extends DomainException {
  public readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(identifier: string) {
    super(`Transfer not found: ${identifier}`, 'TRANSFER_NOT_FOUND');
    this.name = 'TransferNotFoundException';
  }
}

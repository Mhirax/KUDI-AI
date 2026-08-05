import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class DepositNotFoundException extends DomainException {
  public override readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(identifier: string) {
    super(`Deposit ${identifier} not found`, 'DEPOSIT_NOT_FOUND');
  }
}

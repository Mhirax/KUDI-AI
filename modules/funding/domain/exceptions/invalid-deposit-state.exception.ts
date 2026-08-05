import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class InvalidDepositStateException extends DomainException {
  public override readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(depositId: string, attempted: string, current: string) {
    super(`Cannot ${attempted} deposit ${depositId} in status ${current}`, 'INVALID_DEPOSIT_STATE');
  }
}

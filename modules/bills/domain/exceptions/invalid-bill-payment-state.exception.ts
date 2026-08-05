import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class InvalidBillPaymentStateException extends DomainException {
  public override readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(billPaymentId: string, attempted: string, current: string) {
    super(
      `Cannot ${attempted} bill payment ${billPaymentId} in status ${current}`,
      'INVALID_BILL_PAYMENT_STATE',
    );
  }
}

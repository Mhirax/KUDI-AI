import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class BillPaymentNotFoundException extends DomainException {
  public override readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(identifier: string) {
    super(`Bill payment ${identifier} not found`, 'BILL_PAYMENT_NOT_FOUND');
  }
}

import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class BillProviderException extends DomainException {
  public override readonly httpStatus = HttpStatus.BAD_GATEWAY;

  constructor(message: string) {
    super(`Bill provider error: ${message}`, 'BILL_PROVIDER_ERROR');
  }
}

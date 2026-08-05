import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class InvalidBillCustomerException extends DomainException {
  public override readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(customerIdentifier: string, billerCode: string) {
    super(
      `Customer ${customerIdentifier} could not be validated with biller ${billerCode}`,
      'INVALID_BILL_CUSTOMER',
    );
  }
}

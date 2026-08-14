import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class CurrencyMismatchException extends DomainException {
  public readonly httpStatus = HttpStatus.BAD_REQUEST;

  constructor(accountCurrency: string, amountCurrency: string) {
    super(
      `Currency mismatch: account is ${accountCurrency}, amount is ${amountCurrency}`,
      'CURRENCY_MISMATCH',
    );
    this.name = 'CurrencyMismatchException';
  }
}

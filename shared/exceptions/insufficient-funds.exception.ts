import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class InsufficientFundsException extends DomainException {
  public readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(accountId: string) {
    super(`Account ${accountId} has insufficient funds`, 'INSUFFICIENT_FUNDS');
    this.name = 'InsufficientFundsException';
  }
}

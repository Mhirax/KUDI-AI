import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class SavingsGoalNotFoundException extends DomainException {
  public override readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(identifier: string) {
    super(`Savings goal ${identifier} not found`, 'SAVINGS_GOAL_NOT_FOUND');
  }
}

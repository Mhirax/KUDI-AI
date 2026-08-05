import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class InvalidSavingsGoalStateException extends DomainException {
  public override readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(goalId: string, attempted: string, current: string) {
    super(
      `Cannot ${attempted} savings goal ${goalId} in status ${current}`,
      'INVALID_SAVINGS_GOAL_STATE',
    );
  }
}

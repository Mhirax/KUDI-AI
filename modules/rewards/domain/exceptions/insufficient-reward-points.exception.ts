import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class InsufficientRewardPointsException extends DomainException {
  public override readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(userId: string) {
    super(
      `User ${userId} does not have enough reward points for this redemption`,
      'INSUFFICIENT_REWARD_POINTS',
    );
  }
}

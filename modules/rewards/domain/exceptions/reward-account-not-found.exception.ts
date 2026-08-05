import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class RewardAccountNotFoundException extends DomainException {
  public override readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(identifier: string) {
    super(`Reward account ${identifier} not found`, 'REWARD_ACCOUNT_NOT_FOUND');
  }
}

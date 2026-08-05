import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSavingsGoalByIdQuery } from './get-savings-goal-by-id.query';
import {
  SAVINGS_GOAL_REPOSITORY,
  ISavingsGoalRepository,
} from '../../../domain/repositories/savings-goal.repository.interface';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { SavingsGoalNotFoundException } from '../../../domain/exceptions/savings-goal-not-found.exception';
import { SavingsGoalResponseDto } from '../../dto/savings-goal-response.dto';

@Injectable()
@QueryHandler(GetSavingsGoalByIdQuery)
export class GetSavingsGoalByIdHandler implements IQueryHandler<
  GetSavingsGoalByIdQuery,
  SavingsGoalResponseDto
> {
  constructor(
    @Inject(SAVINGS_GOAL_REPOSITORY) private readonly savingsGoalRepository: ISavingsGoalRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
  ) {}

  async execute(query: GetSavingsGoalByIdQuery): Promise<SavingsGoalResponseDto> {
    const goal = await this.savingsGoalRepository.findById(query.savingsGoalId);
    if (!goal) {
      throw new SavingsGoalNotFoundException(query.savingsGoalId);
    }
    if (goal.userId !== query.requestingUserId && !query.isAdmin) {
      throw new ForbiddenException('You may only access your own savings goals');
    }

    const account = await this.accountRepository.findById(goal.savingsAccountId);
    const savedAmount = account ? account.balance.toMajorUnitsString() : '0.00';

    return SavingsGoalResponseDto.fromDomain(goal, savedAmount);
  }
}

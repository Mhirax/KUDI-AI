import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListMySavingsGoalsQuery } from './list-my-savings-goals.query';
import {
  SAVINGS_GOAL_REPOSITORY,
  ISavingsGoalRepository,
} from '../../../domain/repositories/savings-goal.repository.interface';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { SavingsGoalResponseDto } from '../../dto/savings-goal-response.dto';

@Injectable()
@QueryHandler(ListMySavingsGoalsQuery)
export class ListMySavingsGoalsHandler implements IQueryHandler<
  ListMySavingsGoalsQuery,
  SavingsGoalResponseDto[]
> {
  constructor(
    @Inject(SAVINGS_GOAL_REPOSITORY) private readonly savingsGoalRepository: ISavingsGoalRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
  ) {}

  async execute(query: ListMySavingsGoalsQuery): Promise<SavingsGoalResponseDto[]> {
    const goals = await this.savingsGoalRepository.findAllByUserId(query.userId);
    return Promise.all(
      goals.map(async (goal) => {
        const account = await this.accountRepository.findById(goal.savingsAccountId);
        const savedAmount = account ? account.balance.toMajorUnitsString() : '0.00';
        return SavingsGoalResponseDto.fromDomain(goal, savedAmount);
      }),
    );
  }
}

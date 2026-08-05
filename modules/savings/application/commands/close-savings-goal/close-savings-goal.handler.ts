import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CloseSavingsGoalCommand } from './close-savings-goal.command';
import {
  SAVINGS_GOAL_REPOSITORY,
  ISavingsGoalRepository,
} from '../../../domain/repositories/savings-goal.repository.interface';
import { SavingsGoalNotFoundException } from '../../../domain/exceptions/savings-goal-not-found.exception';
import { SavingsGoalResponseDto } from '../../dto/savings-goal-response.dto';

import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { DebitAccountCommand } from '../../../../accounts/application/commands/debit-account/debit-account.command';
import { CreditAccountCommand } from '../../../../accounts/application/commands/credit-account/credit-account.command';
import { CloseAccountCommand } from '../../../../accounts/application/commands/close-account/close-account.command';

/**
 * Use case: close a savings goal. Account.close() (see Accounts
 * module) enforces a zero-balance invariant, so any remaining funds
 * are swept back to the source wallet first — the customer never has
 * to manually withdraw to zero before closing, and the invariant is
 * still enforced by Accounts itself, not re-implemented here.
 */
@Injectable()
@CommandHandler(CloseSavingsGoalCommand)
export class CloseSavingsGoalHandler implements ICommandHandler<
  CloseSavingsGoalCommand,
  SavingsGoalResponseDto
> {
  constructor(
    @Inject(SAVINGS_GOAL_REPOSITORY) private readonly savingsGoalRepository: ISavingsGoalRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CloseSavingsGoalCommand): Promise<SavingsGoalResponseDto> {
    const goal = await this.savingsGoalRepository.findById(command.savingsGoalId);
    if (!goal) {
      throw new SavingsGoalNotFoundException(command.savingsGoalId);
    }
    if (goal.userId !== command.userId) {
      throw new ForbiddenException('You may only close your own savings goals');
    }

    const savingsAccount = await this.accountRepository.findById(goal.savingsAccountId);
    if (savingsAccount && !savingsAccount.balance.isZero()) {
      const sweepAmount = savingsAccount.balance.toMajorUnitsString();
      const reference = `KUDI-SAVE-CLOSE-${goal.id}-${Date.now()}`;
      await this.commandBus.execute(
        new DebitAccountCommand(goal.savingsAccountId, sweepAmount, goal.currency, reference),
      );
      await this.commandBus.execute(
        new CreditAccountCommand(goal.sourceAccountId, sweepAmount, goal.currency, reference),
      );
    }

    await this.commandBus.execute(new CloseAccountCommand(goal.savingsAccountId));

    goal.close();
    await this.savingsGoalRepository.save(goal);
    goal.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return SavingsGoalResponseDto.fromDomain(goal, '0.00');
  }
}

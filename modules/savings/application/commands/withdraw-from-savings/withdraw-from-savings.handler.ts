import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { WithdrawFromSavingsCommand } from './withdraw-from-savings.command';
import {
  SAVINGS_GOAL_REPOSITORY,
  ISavingsGoalRepository,
} from '../../../domain/repositories/savings-goal.repository.interface';
import { SavingsGoalNotFoundException } from '../../../domain/exceptions/savings-goal-not-found.exception';
import { SavingsGoalResponseDto } from '../../dto/savings-goal-response.dto';
import { Money } from '../../../../../shared/value-objects/money.vo';

import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { DebitAccountCommand } from '../../../../accounts/application/commands/debit-account/debit-account.command';
import { CreditAccountCommand } from '../../../../accounts/application/commands/credit-account/credit-account.command';

/**
 * Use case: move money out of a savings goal back into the wallet it
 * was funded from. Mirrors DepositToSavingsHandler in reverse — see
 * that class's header for why both legs go through Accounts' own
 * commands rather than a direct Prisma transaction.
 */
@Injectable()
@CommandHandler(WithdrawFromSavingsCommand)
export class WithdrawFromSavingsHandler implements ICommandHandler<
  WithdrawFromSavingsCommand,
  SavingsGoalResponseDto
> {
  constructor(
    @Inject(SAVINGS_GOAL_REPOSITORY) private readonly savingsGoalRepository: ISavingsGoalRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: WithdrawFromSavingsCommand): Promise<SavingsGoalResponseDto> {
    const goal = await this.savingsGoalRepository.findById(command.savingsGoalId);
    if (!goal) {
      throw new SavingsGoalNotFoundException(command.savingsGoalId);
    }
    if (goal.userId !== command.userId) {
      throw new ForbiddenException('You may only withdraw from your own savings goals');
    }

    const amount = Money.fromDecimalString(command.amount, goal.currency);
    const reference = `KUDI-SAVE-WD-${goal.id}-${Date.now()}`;

    await this.commandBus.execute(
      new DebitAccountCommand(goal.savingsAccountId, command.amount, goal.currency, reference),
    );
    await this.commandBus.execute(
      new CreditAccountCommand(goal.sourceAccountId, command.amount, goal.currency, reference),
    );

    goal.recordWithdrawal(amount);
    await this.savingsGoalRepository.save(goal);
    goal.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    const savingsAccount = await this.accountRepository.findById(goal.savingsAccountId);
    const savedAmount = savingsAccount ? savingsAccount.balance.toMajorUnitsString() : '0.00';

    return SavingsGoalResponseDto.fromDomain(goal, savedAmount);
  }
}

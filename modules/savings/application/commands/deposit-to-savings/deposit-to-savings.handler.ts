import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { DepositToSavingsCommand } from './deposit-to-savings.command';
import {
  SAVINGS_GOAL_REPOSITORY,
  ISavingsGoalRepository,
} from '../../../domain/repositories/savings-goal.repository.interface';
import { SavingsGoalNotFoundException } from '../../../domain/exceptions/savings-goal-not-found.exception';
import { SavingsGoalResponseDto } from '../../dto/savings-goal-response.dto';
import { Money } from '../../../../../shared/value-objects/money.vo';

// Cross-module dependency on Accounts' *port* and its own
// Credit/DebitAccountCommand — moving money between two of a user's
// own accounts is exactly what those commands are for; Savings never
// mutates Account balances directly.
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { DebitAccountCommand } from '../../../../accounts/application/commands/debit-account/debit-account.command';
import { CreditAccountCommand } from '../../../../accounts/application/commands/credit-account/credit-account.command';

/**
 * Use case: move money from a user's wallet into one of their savings
 * goals. A two-leg internal transfer, orchestrated the same way
 * Transfers' internal executor moves money between two accounts —
 * except here both legs are dispatched through Accounts' own commands
 * (not a direct Prisma transaction) since both accounts already belong
 * to Accounts' bounded context and Savings has no reason to reach
 * into its internals.
 */
@Injectable()
@CommandHandler(DepositToSavingsCommand)
export class DepositToSavingsHandler implements ICommandHandler<
  DepositToSavingsCommand,
  SavingsGoalResponseDto
> {
  constructor(
    @Inject(SAVINGS_GOAL_REPOSITORY) private readonly savingsGoalRepository: ISavingsGoalRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DepositToSavingsCommand): Promise<SavingsGoalResponseDto> {
    const goal = await this.savingsGoalRepository.findById(command.savingsGoalId);
    if (!goal) {
      throw new SavingsGoalNotFoundException(command.savingsGoalId);
    }
    if (goal.userId !== command.userId) {
      throw new ForbiddenException('You may only fund your own savings goals');
    }

    const amount = Money.fromDecimalString(command.amount, goal.currency);
    const reference = `KUDI-SAVE-DEP-${goal.id}-${Date.now()}`;

    await this.commandBus.execute(
      new DebitAccountCommand(goal.sourceAccountId, command.amount, goal.currency, reference),
    );
    await this.commandBus.execute(
      new CreditAccountCommand(goal.savingsAccountId, command.amount, goal.currency, reference),
    );

    goal.recordDeposit(amount);
    await this.savingsGoalRepository.save(goal);
    goal.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    const savingsAccount = await this.accountRepository.findById(goal.savingsAccountId);
    const savedAmount = savingsAccount ? savingsAccount.balance.toMajorUnitsString() : '0.00';

    return SavingsGoalResponseDto.fromDomain(goal, savedAmount);
  }
}

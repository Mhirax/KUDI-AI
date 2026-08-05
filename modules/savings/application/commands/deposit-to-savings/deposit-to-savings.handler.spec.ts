import { CommandBus, EventBus } from '@nestjs/cqrs';
import { ForbiddenException } from '@nestjs/common';
import { DepositToSavingsHandler } from './deposit-to-savings.handler';
import { DepositToSavingsCommand } from './deposit-to-savings.command';
import { ISavingsGoalRepository } from '../../../domain/repositories/savings-goal.repository.interface';
import { SavingsGoal } from '../../../domain/entities/savings-goal.entity';
import { SavingsGoalNotFoundException } from '../../../domain/exceptions/savings-goal-not-found.exception';
import { DebitAccountCommand } from '../../../../accounts/application/commands/debit-account/debit-account.command';
import { CreditAccountCommand } from '../../../../accounts/application/commands/credit-account/credit-account.command';
import { IAccountRepository } from '../../../../accounts/domain/repositories/account.repository.interface';
import { Account } from '../../../../accounts/domain/entities/account.entity';
import { AccountNumber } from '../../../../accounts/domain/value-objects/account-number.vo';
import { AccountType } from '../../../../accounts/domain/enums/account-type.enum';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../../shared/enums/currency.enum';

function activeSavingsAccountWithBalance(balance: string): Account {
  const account = Account.open({
    userId: 'user-1',
    accountNumber: AccountNumber.create('9990009999'),
    accountType: AccountType.SAVINGS,
    currency: Currency.NGN,
  });
  account.pullDomainEvents();
  account.activate();
  account.credit(Money.fromDecimalString(balance, Currency.NGN), 'seed');
  account.pullDomainEvents();
  return account;
}

function goal(): SavingsGoal {
  return SavingsGoal.create({
    userId: 'user-1',
    savingsAccountId: 'savings-account-1',
    sourceAccountId: 'source-account-1',
    name: 'Rainy Day',
    targetAmount: null,
    currency: Currency.NGN,
  });
}

describe('DepositToSavingsHandler', () => {
  let savingsGoalRepository: jest.Mocked<ISavingsGoalRepository>;
  let accountRepository: jest.Mocked<IAccountRepository>;
  let commandBus: jest.Mocked<Pick<CommandBus, 'execute'>>;
  let eventBus: jest.Mocked<Pick<EventBus, 'publish'>>;
  let handler: DepositToSavingsHandler;

  beforeEach(() => {
    savingsGoalRepository = {
      findById: jest.fn().mockResolvedValue(goal()),
      findAllByUserId: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<ISavingsGoalRepository>;
    accountRepository = {
      findById: jest.fn().mockResolvedValue(activeSavingsAccountWithBalance('3000.00')),
      findByAccountNumber: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByAccountNumber: jest.fn(),
      save: jest.fn(),
    };
    commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    eventBus = { publish: jest.fn() };
    handler = new DepositToSavingsHandler(
      savingsGoalRepository,
      accountRepository,
      commandBus as unknown as CommandBus,
      eventBus as unknown as EventBus,
    );
  });

  it('dispatches a debit on the source account and a credit on the savings account, in that order', async () => {
    await handler.execute(new DepositToSavingsCommand('user-1', 'goal-1', '500.00'));

    expect(commandBus.execute).toHaveBeenNthCalledWith(1, expect.any(DebitAccountCommand));
    expect(commandBus.execute).toHaveBeenNthCalledWith(2, expect.any(CreditAccountCommand));
    const debitCommand = commandBus.execute.mock.calls[0][0] as DebitAccountCommand;
    expect(debitCommand.accountId).toBe('source-account-1');
    const creditCommand = commandBus.execute.mock.calls[1][0] as CreditAccountCommand;
    expect(creditCommand.accountId).toBe('savings-account-1');
  });

  it('records the deposit on the goal and returns the updated saved amount', async () => {
    const response = await handler.execute(
      new DepositToSavingsCommand('user-1', 'goal-1', '500.00'),
    );

    expect(savingsGoalRepository.save).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalled();
    expect(response.savedAmount).toBe('3000.00');
  });

  it('throws SavingsGoalNotFoundException when the goal does not exist', async () => {
    savingsGoalRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new DepositToSavingsCommand('user-1', 'missing', '500.00')),
    ).rejects.toThrow(SavingsGoalNotFoundException);
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it("refuses to deposit into someone else's savings goal", async () => {
    await expect(
      handler.execute(new DepositToSavingsCommand('intruder', 'goal-1', '500.00')),
    ).rejects.toThrow(ForbiddenException);
    expect(commandBus.execute).not.toHaveBeenCalled();
  });
});

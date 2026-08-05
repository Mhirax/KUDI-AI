import { SavingsGoal } from './savings-goal.entity';
import { SavingsGoalStatus } from '../enums/savings-goal-status.enum';
import { InvalidSavingsGoalStateException } from '../exceptions/invalid-savings-goal-state.exception';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

function createGoal(targetAmount: Money | null = null): SavingsGoal {
  return SavingsGoal.create({
    userId: 'user-1',
    savingsAccountId: 'savings-account-1',
    sourceAccountId: 'source-account-1',
    name: 'New Laptop',
    targetAmount,
    currency: Currency.NGN,
  });
}

describe('SavingsGoal aggregate', () => {
  it('creates ACTIVE and emits SavingsGoalCreatedEvent', () => {
    const goal = createGoal();

    expect(goal.status).toBe(SavingsGoalStatus.ACTIVE);
    expect(goal.name).toBe('New Laptop');
    expect(goal.targetAmount).toBeNull();
    expect(goal.pullDomainEvents()[0].eventName).toBe('savings.goal.created');
  });

  it('records a deposit and emits SavingsGoalFundedEvent without holding a balance itself', () => {
    const goal = createGoal();
    goal.pullDomainEvents();

    goal.recordDeposit(Money.fromDecimalString('5000.00', Currency.NGN));

    expect(goal.pullDomainEvents()[0].eventName).toBe('savings.goal.funded');
    expect(goal.version).toBe(1);
  });

  it('records a withdrawal and emits SavingsGoalWithdrawnEvent', () => {
    const goal = createGoal();
    goal.pullDomainEvents();

    goal.recordWithdrawal(Money.fromDecimalString('1000.00', Currency.NGN));

    expect(goal.pullDomainEvents()[0].eventName).toBe('savings.goal.withdrawn');
  });

  it('closes an active goal and emits SavingsGoalClosedEvent', () => {
    const goal = createGoal();
    goal.pullDomainEvents();

    goal.close();

    expect(goal.status).toBe(SavingsGoalStatus.CLOSED);
    expect(goal.pullDomainEvents()[0].eventName).toBe('savings.goal.closed');
  });

  it('rejects deposits, withdrawals, and re-closing once closed', () => {
    const goal = createGoal();
    goal.close();

    expect(() => goal.recordDeposit(Money.fromDecimalString('100.00', Currency.NGN))).toThrow(
      InvalidSavingsGoalStateException,
    );
    expect(() => goal.recordWithdrawal(Money.fromDecimalString('100.00', Currency.NGN))).toThrow(
      InvalidSavingsGoalStateException,
    );
    expect(() => goal.close()).toThrow(InvalidSavingsGoalStateException);
  });
});

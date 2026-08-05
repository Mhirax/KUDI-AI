import { SavingsGoal as PrismaSavingsGoal } from '@prisma/client';
import { SavingsGoal } from '../../domain/entities/savings-goal.entity';
import { SavingsGoalStatus } from '../../domain/enums/savings-goal-status.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

export class SavingsGoalMapper {
  static toDomain(record: PrismaSavingsGoal): SavingsGoal {
    const currency = record.currency as Currency;
    return SavingsGoal.reconstitute({
      id: record.id,
      userId: record.userId,
      savingsAccountId: record.savingsAccountId,
      sourceAccountId: record.sourceAccountId,
      name: record.name,
      targetAmount:
        record.targetAmountMinorUnits !== null
          ? Money.fromMinorUnits(record.targetAmountMinorUnits, currency)
          : null,
      currency,
      status: record.status as SavingsGoalStatus,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(goal: SavingsGoal): PrismaSavingsGoal {
    const props = goal.toProps();
    return {
      id: props.id,
      userId: props.userId,
      savingsAccountId: props.savingsAccountId,
      sourceAccountId: props.sourceAccountId,
      name: props.name,
      targetAmountMinorUnits: props.targetAmount ? props.targetAmount.getMinorUnits() : null,
      currency: props.currency,
      status: props.status,
      version: props.version,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}

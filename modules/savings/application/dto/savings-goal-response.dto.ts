import { SavingsGoal } from '../../domain/entities/savings-goal.entity';

export class SavingsGoalResponseDto {
  id: string;
  userId: string;
  savingsAccountId: string;
  sourceAccountId: string;
  name: string;
  /** Major-unit decimal string; null when the goal has no fixed target. */
  targetAmount: string | null;
  /** Current balance of the underlying savings account — major-unit decimal string. */
  savedAmount: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;

  static fromDomain(goal: SavingsGoal, savedAmount: string): SavingsGoalResponseDto {
    const props = goal.toProps();
    return {
      id: props.id,
      userId: props.userId,
      savingsAccountId: props.savingsAccountId,
      sourceAccountId: props.sourceAccountId,
      name: props.name,
      targetAmount: props.targetAmount ? props.targetAmount.toMajorUnitsString() : null,
      savedAmount,
      currency: props.currency,
      status: props.status,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    };
  }
}

import { SavingsGoal } from '../entities/savings-goal.entity';

export interface ISavingsGoalRepository {
  findById(id: string): Promise<SavingsGoal | null>;
  findBySavingsAccountId(savingsAccountId: string): Promise<SavingsGoal | null>;
  findAllByUserId(userId: string): Promise<SavingsGoal[]>;
  save(goal: SavingsGoal): Promise<void>;
}

export const SAVINGS_GOAL_REPOSITORY = Symbol('SAVINGS_GOAL_REPOSITORY');

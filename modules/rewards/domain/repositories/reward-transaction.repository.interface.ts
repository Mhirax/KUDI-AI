import { RewardTransaction } from '../entities/reward-transaction.entity';

export interface RewardTransactionPage {
  transactions: RewardTransaction[];
  total: number;
}

export interface IRewardTransactionRepository {
  /** Idempotency check: has this source domain event already been recorded? */
  existsBySourceEventId(sourceEventId: string): Promise<boolean>;
  findPageByUserId(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<RewardTransactionPage>;
  save(transaction: RewardTransaction): Promise<void>;
}

export const REWARD_TRANSACTION_REPOSITORY = Symbol('REWARD_TRANSACTION_REPOSITORY');

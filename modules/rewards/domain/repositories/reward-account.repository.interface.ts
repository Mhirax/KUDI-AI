import { RewardAccount } from '../entities/reward-account.entity';

export interface IRewardAccountRepository {
  findById(id: string): Promise<RewardAccount | null>;
  findByUserId(userId: string): Promise<RewardAccount | null>;
  findByReferralCode(referralCode: string): Promise<RewardAccount | null>;
  save(account: RewardAccount): Promise<void>;
}

export const REWARD_ACCOUNT_REPOSITORY = Symbol('REWARD_ACCOUNT_REPOSITORY');

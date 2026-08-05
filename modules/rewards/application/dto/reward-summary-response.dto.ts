import { RewardAccount } from '../../domain/entities/reward-account.entity';

export class RewardSummaryResponseDto {
  userId: string;
  pointsBalance: number;
  totalEarned: number;
  totalRedeemed: number;
  referralCode: string;

  static fromDomain(account: RewardAccount): RewardSummaryResponseDto {
    const props = account.toProps();
    return {
      userId: props.userId,
      pointsBalance: props.pointsBalance,
      totalEarned: props.totalEarned,
      totalRedeemed: props.totalRedeemed,
      referralCode: props.referralCode,
    };
  }
}

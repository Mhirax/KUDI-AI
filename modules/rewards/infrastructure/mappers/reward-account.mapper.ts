import { RewardAccount as PrismaRewardAccount } from '@prisma/client';
import { RewardAccount } from '../../domain/entities/reward-account.entity';

export class RewardAccountMapper {
  static toDomain(record: PrismaRewardAccount): RewardAccount {
    return RewardAccount.reconstitute({
      id: record.id,
      userId: record.userId,
      pointsBalance: record.pointsBalance,
      totalEarned: record.totalEarned,
      totalRedeemed: record.totalRedeemed,
      referralCode: record.referralCode,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(account: RewardAccount): PrismaRewardAccount {
    const props = account.toProps();
    return {
      id: props.id,
      userId: props.userId,
      pointsBalance: props.pointsBalance,
      totalEarned: props.totalEarned,
      totalRedeemed: props.totalRedeemed,
      referralCode: props.referralCode,
      version: props.version,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}

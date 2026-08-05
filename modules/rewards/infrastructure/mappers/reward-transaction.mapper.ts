import { RewardTransaction as PrismaRewardTransaction } from '@prisma/client';
import { RewardTransaction } from '../../domain/entities/reward-transaction.entity';
import { RewardTransactionType } from '../../domain/enums/reward-transaction-type.enum';
import { RewardTransactionStatus } from '../../domain/enums/reward-transaction-status.enum';

export class RewardTransactionMapper {
  static toDomain(record: PrismaRewardTransaction): RewardTransaction {
    return RewardTransaction.reconstitute({
      id: record.id,
      userId: record.userId,
      type: record.type as RewardTransactionType,
      status: record.status as RewardTransactionStatus,
      points: record.points,
      description: record.description,
      sourceEventId: record.sourceEventId,
      sourceReference: record.sourceReference,
      redemptionType: record.redemptionType,
      createdAt: record.createdAt,
    });
  }

  static toPersistence(transaction: RewardTransaction): PrismaRewardTransaction {
    const props = transaction.toProps();
    return {
      id: props.id,
      userId: props.userId,
      type: props.type,
      status: props.status,
      points: props.points,
      description: props.description,
      sourceEventId: props.sourceEventId,
      sourceReference: props.sourceReference,
      redemptionType: props.redemptionType,
      createdAt: props.createdAt,
    };
  }
}

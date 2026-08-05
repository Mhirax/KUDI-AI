import { RewardTransaction } from '../../domain/entities/reward-transaction.entity';

export class RewardTransactionResponseDto {
  id: string;
  type: string;
  status: string;
  points: number;
  description: string;
  sourceReference: string | null;
  redemptionType: string | null;
  createdAt: string;

  static fromDomain(transaction: RewardTransaction): RewardTransactionResponseDto {
    const props = transaction.toProps();
    return {
      id: props.id,
      type: props.type,
      status: props.status,
      points: props.points,
      description: props.description,
      sourceReference: props.sourceReference,
      redemptionType: props.redemptionType,
      createdAt: props.createdAt.toISOString(),
    };
  }
}

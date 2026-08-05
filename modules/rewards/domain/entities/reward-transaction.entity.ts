import { randomUUID } from 'crypto';
import { RewardTransactionType } from '../enums/reward-transaction-type.enum';
import { RewardTransactionStatus } from '../enums/reward-transaction-status.enum';

export interface RewardTransactionProps {
  id: string;
  userId: string;
  type: RewardTransactionType;
  status: RewardTransactionStatus;
  /** Positive for EARNED/REFERRAL_BONUS, negative for REDEEMED. */
  points: number;
  description: string;
  sourceEventId: string | null;
  sourceReference: string | null;
  redemptionType: string | null;
  createdAt: Date;
}

/**
 * RewardTransaction — an immutable, append-only log entry for one
 * points movement, the Rewards-side analogue of Ledger's LedgerEntry.
 * Not an aggregate root in the transactional sense (nothing re-loads
 * and mutates one); it exists purely to answer "what happened and
 * when" for GET /rewards/history.
 */
export class RewardTransaction {
  private constructor(private readonly props: RewardTransactionProps) {}

  static record(params: {
    userId: string;
    type: RewardTransactionType;
    status?: RewardTransactionStatus;
    points: number;
    description: string;
    sourceEventId?: string | null;
    sourceReference?: string | null;
    redemptionType?: string | null;
  }): RewardTransaction {
    return new RewardTransaction({
      id: randomUUID(),
      userId: params.userId,
      type: params.type,
      status: params.status ?? RewardTransactionStatus.COMPLETED,
      points: params.points,
      description: params.description,
      sourceEventId: params.sourceEventId ?? null,
      sourceReference: params.sourceReference ?? null,
      redemptionType: params.redemptionType ?? null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: RewardTransactionProps): RewardTransaction {
    return new RewardTransaction(props);
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get type(): RewardTransactionType {
    return this.props.type;
  }
  get status(): RewardTransactionStatus {
    return this.props.status;
  }
  get points(): number {
    return this.props.points;
  }
  get description(): string {
    return this.props.description;
  }
  get sourceEventId(): string | null {
    return this.props.sourceEventId;
  }
  get sourceReference(): string | null {
    return this.props.sourceReference;
  }
  get redemptionType(): string | null {
    return this.props.redemptionType;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<RewardTransactionProps> {
    return { ...this.props };
  }
}

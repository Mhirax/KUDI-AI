import { randomUUID, randomBytes } from 'crypto';
import { DomainEvent } from '../../../../shared/events/domain-event.base';
import { InsufficientRewardPointsException } from '../exceptions/insufficient-reward-points.exception';
import { RewardPointsEarnedEvent } from '../events/reward-points-earned.event';
import { RewardPointsRedeemedEvent } from '../events/reward-points-redeemed.event';
import { ReferralBonusAwardedEvent } from '../events/referral-bonus-awarded.event';
import { RedemptionType } from '../enums/redemption-type.enum';

export interface RewardAccountProps {
  id: string;
  userId: string;
  pointsBalance: number;
  totalEarned: number;
  totalRedeemed: number;
  referralCode: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * RewardAccount Aggregate Root — one per user. Points are an integer
 * ledger, never `Money`/minor-units, since they are not currency and
 * carry no direct regulatory weight the way a Naira balance does.
 * Earning and redemption still mutate this aggregate under the same
 * optimistic-concurrency discipline as every other bounded context's
 * aggregate (see `version`).
 */
export class RewardAccount {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private props: RewardAccountProps) {}

  static open(userId: string): RewardAccount {
    const now = new Date();
    return new RewardAccount({
      id: randomUUID(),
      userId,
      pointsBalance: 0,
      totalEarned: 0,
      totalRedeemed: 0,
      referralCode: RewardAccount.generateReferralCode(),
      version: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: RewardAccountProps): RewardAccount {
    return new RewardAccount(props);
  }

  private static generateReferralCode(): string {
    return `KUDI-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  earn(points: number, sourceReference: string | null): void {
    if (points <= 0) {
      return;
    }
    this.props.pointsBalance += points;
    this.props.totalEarned += points;
    this.touch();
    this.addDomainEvent(
      new RewardPointsEarnedEvent(this.props.id, this.props.userId, points, sourceReference),
    );
  }

  redeem(points: number, redemptionType: RedemptionType): void {
    if (points <= 0 || this.props.pointsBalance < points) {
      throw new InsufficientRewardPointsException(this.props.userId);
    }
    this.props.pointsBalance -= points;
    this.props.totalRedeemed += points;
    this.touch();
    this.addDomainEvent(
      new RewardPointsRedeemedEvent(this.props.id, this.props.userId, points, redemptionType),
    );
  }

  awardReferralBonus(points: number, role: 'REFERRER' | 'REFEREE'): void {
    this.props.pointsBalance += points;
    this.props.totalEarned += points;
    this.touch();
    this.addDomainEvent(
      new ReferralBonusAwardedEvent(this.props.id, this.props.userId, points, role),
    );
  }

  private touch(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }

  private addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get pointsBalance(): number {
    return this.props.pointsBalance;
  }
  get totalEarned(): number {
    return this.props.totalEarned;
  }
  get totalRedeemed(): number {
    return this.props.totalRedeemed;
  }
  get referralCode(): string {
    return this.props.referralCode;
  }
  get version(): number {
    return this.props.version;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toProps(): Readonly<RewardAccountProps> {
    return { ...this.props };
  }
}

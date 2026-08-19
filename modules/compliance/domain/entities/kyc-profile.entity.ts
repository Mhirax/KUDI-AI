import { randomUUID } from 'crypto';
import { KycTier } from '../enums/kyc-tier.enum';
import { VerificationType } from '../enums/verification-type.enum';
import { VerificationAlreadyPassedException } from '../exceptions/verification-already-passed.exception';
import { SanctionsFlagNotOpenException } from '../exceptions/sanctions-flag-not-open.exception';
import { KycProfileCreatedEvent } from '../events/kyc-profile-created.event';
import { VerificationPassedEvent } from '../events/verification-passed.event';
import { VerificationFailedEvent } from '../events/verification-failed.event';
import { KycTierUpgradedEvent } from '../events/kyc-tier-upgraded.event';
import { KycProfileFlaggedForSanctionsReviewEvent } from '../events/kyc-profile-flagged-for-sanctions-review.event';
import { KycProfileSanctionsFlagClearedEvent } from '../events/kyc-profile-sanctions-flag-cleared.event';
import { DomainEvent } from '../../../../shared/events/domain-event.base';

export interface KycProfileProps {
  id: string;
  userId: string;
  tier: KycTier;
  bvnVerifiedAt: Date | null;
  bvnHash: string | null;
  bvnMasked: string | null;
  ninVerifiedAt: Date | null;
  ninHash: string | null;
  ninMasked: string | null;
  sanctionsFlaggedAt: Date | null;
  sanctionsClearedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * KycProfile Aggregate Root.
 *
 * One profile per user, created automatically on registration (see
 * modules/compliance/application/event-handlers/user-registered.handler.ts,
 * which reacts to Identity's `UserRegisteredEvent`). Owns the tier
 * progression invariant: TIER_1 (default) → TIER_2 (BVN verified) →
 * TIER_3 (BVN + NIN both verified). Never stores a raw BVN/NIN — only
 * a SHA-256 hash (dedup) and a masked display form ever reach this
 * aggregate's state; see infrastructure/mappers for where the raw
 * value is discarded.
 */
export class KycProfile {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private props: KycProfileProps) {}

  static createDefault(userId: string): KycProfile {
    const now = new Date();
    const profile = new KycProfile({
      id: randomUUID(),
      userId,
      tier: KycTier.TIER_1,
      bvnVerifiedAt: null,
      bvnHash: null,
      bvnMasked: null,
      ninVerifiedAt: null,
      ninHash: null,
      ninMasked: null,
      sanctionsFlaggedAt: null,
      sanctionsClearedAt: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    profile.addDomainEvent(new KycProfileCreatedEvent(profile.props.id, userId));
    return profile;
  }

  static reconstitute(props: KycProfileProps): KycProfile {
    return new KycProfile(props);
  }

  recordBvnVerified(bvnHash: string, bvnMasked: string): void {
    if (this.props.bvnVerifiedAt) {
      throw new VerificationAlreadyPassedException(VerificationType.BVN);
    }

    this.props.bvnVerifiedAt = new Date();
    this.props.bvnHash = bvnHash;
    this.props.bvnMasked = bvnMasked;
    this.touch();

    this.addDomainEvent(
      new VerificationPassedEvent(this.props.id, this.props.userId, VerificationType.BVN),
    );

    if (this.props.tier === KycTier.TIER_1) {
      this.props.tier = KycTier.TIER_2;
      this.addDomainEvent(
        new KycTierUpgradedEvent(this.props.id, this.props.userId, KycTier.TIER_2),
      );
    }
  }

  recordNinVerified(ninHash: string, ninMasked: string): void {
    if (this.props.ninVerifiedAt) {
      throw new VerificationAlreadyPassedException(VerificationType.NIN);
    }

    this.props.ninVerifiedAt = new Date();
    this.props.ninHash = ninHash;
    this.props.ninMasked = ninMasked;
    this.touch();

    this.addDomainEvent(
      new VerificationPassedEvent(this.props.id, this.props.userId, VerificationType.NIN),
    );

    // TIER_3 requires both BVN and NIN — NIN alone does not advance a
    // TIER_1 profile past TIER_1.
    if (this.props.tier === KycTier.TIER_2 && this.props.bvnVerifiedAt) {
      this.props.tier = KycTier.TIER_3;
      this.addDomainEvent(
        new KycTierUpgradedEvent(this.props.id, this.props.userId, KycTier.TIER_3),
      );
    }
  }

  recordVerificationFailed(type: VerificationType, reason: string): void {
    this.touch();
    this.addDomainEvent(
      new VerificationFailedEvent(this.props.id, this.props.userId, type, reason),
    );
  }

  /**
   * Opens a sanctions-screening flag (Phase 4). A no-op if one is
   * already open — screening can run more than once (BVN, then NIN)
   * and must not spam duplicate flags/events for the same open case.
   * If a *previous* flag was already cleared, a new match reopens one.
   */
  flagForSanctionsReview(matchSummary: string): void {
    if (this.isSanctionsFlagOpen()) {
      return;
    }
    this.props.sanctionsFlaggedAt = new Date();
    this.props.sanctionsClearedAt = null;
    this.touch();
    this.addDomainEvent(
      new KycProfileFlaggedForSanctionsReviewEvent(this.props.id, this.props.userId, matchSummary),
    );
  }

  /** Staff-only action (Phase 5-style surface) — throws if there is no open flag to clear. */
  clearSanctionsFlag(clearedByStaffUserId: string, reason: string): void {
    if (!this.isSanctionsFlagOpen()) {
      throw new SanctionsFlagNotOpenException(this.props.userId);
    }
    this.props.sanctionsClearedAt = new Date();
    this.touch();
    this.addDomainEvent(
      new KycProfileSanctionsFlagClearedEvent(this.props.id, this.props.userId, clearedByStaffUserId, reason),
    );
  }

  private isSanctionsFlagOpen(): boolean {
    return this.props.sanctionsFlaggedAt !== null && this.props.sanctionsClearedAt === null;
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

  get tier(): KycTier {
    return this.props.tier;
  }

  get bvnVerifiedAt(): Date | null {
    return this.props.bvnVerifiedAt;
  }

  get bvnMasked(): string | null {
    return this.props.bvnMasked;
  }

  get ninVerifiedAt(): Date | null {
    return this.props.ninVerifiedAt;
  }

  get ninMasked(): string | null {
    return this.props.ninMasked;
  }

  get sanctionsFlaggedAt(): Date | null {
    return this.props.sanctionsFlaggedAt;
  }

  get sanctionsClearedAt(): Date | null {
    return this.props.sanctionsClearedAt;
  }

  get isCurrentlyFlaggedForSanctions(): boolean {
    return this.isSanctionsFlagOpen();
  }

  get version(): number {
    return this.props.version;
  }

  toProps(): Readonly<KycProfileProps> {
    return { ...this.props };
  }
}

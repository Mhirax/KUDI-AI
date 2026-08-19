import { randomUUID } from 'crypto';
import { KycAuditEventType } from '../enums/kyc-audit-event-type.enum';
import { KycAuditOutcome } from '../enums/kyc-audit-outcome.enum';
import { VerificationType } from '../enums/verification-type.enum';
import { KycTier } from '../enums/kyc-tier.enum';

export interface KycAuditLogEntryProps {
  id: string;
  userId: string;
  kycProfileId: string;
  eventType: KycAuditEventType;
  verificationType: VerificationType | null;
  outcome: KycAuditOutcome | null;
  failureReason: string | null;
  previousTier: KycTier | null;
  newTier: KycTier | null;
  createdAt: Date;
}

/**
 * KycAuditLogEntry — an append-only fact record, not a mutable
 * aggregate. Unlike `KycProfile`/`Transfer`, it never changes after
 * creation and never raises its own domain events; it *is* the durable
 * record of a `VerificationPassedEvent`/`VerificationFailedEvent`/
 * `KycTierUpgradedEvent` that already happened. See the two event
 * handlers in `application/event-handlers/` that create these.
 */
export class KycAuditLogEntry {
  private constructor(private readonly props: KycAuditLogEntryProps) {}

  static forVerificationAttempt(params: {
    userId: string;
    kycProfileId: string;
    verificationType: VerificationType;
    outcome: KycAuditOutcome;
    failureReason: string | null;
    occurredAt: Date;
  }): KycAuditLogEntry {
    return new KycAuditLogEntry({
      id: randomUUID(),
      userId: params.userId,
      kycProfileId: params.kycProfileId,
      eventType: KycAuditEventType.VERIFICATION_ATTEMPT,
      verificationType: params.verificationType,
      outcome: params.outcome,
      failureReason: params.failureReason,
      previousTier: null,
      newTier: null,
      createdAt: params.occurredAt,
    });
  }

  static forTierChange(params: {
    userId: string;
    kycProfileId: string;
    previousTier: KycTier;
    newTier: KycTier;
    occurredAt: Date;
  }): KycAuditLogEntry {
    return new KycAuditLogEntry({
      id: randomUUID(),
      userId: params.userId,
      kycProfileId: params.kycProfileId,
      eventType: KycAuditEventType.TIER_CHANGE,
      verificationType: null,
      outcome: null,
      failureReason: null,
      previousTier: params.previousTier,
      newTier: params.newTier,
      createdAt: params.occurredAt,
    });
  }

  static reconstitute(props: KycAuditLogEntryProps): KycAuditLogEntry {
    return new KycAuditLogEntry(props);
  }

  toProps(): Readonly<KycAuditLogEntryProps> {
    return { ...this.props };
  }
}

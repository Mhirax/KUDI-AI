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
  /** Non-null only for staff-performed actions (Phase 5b manual override) — null means the user's own self-service action. */
  performedByUserId: string | null;
  /** Staff justification for a manual override; null for routine self-service entries. */
  notes: string | null;
  createdAt: Date;
}

/**
 * KycAuditLogEntry — an append-only fact record, not a mutable
 * aggregate. Unlike `KycProfile`/`Transfer`, it never changes after
 * creation and never raises its own domain events. Most rows are the
 * durable record of a `VerificationPassedEvent`/`VerificationFailedEvent`/
 * `KycTierUpgradedEvent` that already happened — see
 * `KycAuditRecorderService`, called directly (not via `EventBus`) by
 * the command handlers that raise those events. A `VERIFICATION_ATTEMPT`
 * row can also be written directly by a staff-performed manual
 * override (Phase 5b, `performedByUserId`/`notes` non-null) rather
 * than derived from one of those events.
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
    performedByUserId?: string | null;
    notes?: string | null;
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
      performedByUserId: params.performedByUserId ?? null,
      notes: params.notes ?? null,
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
      performedByUserId: null,
      notes: null,
      createdAt: params.occurredAt,
    });
  }

  static forSanctionsScreening(params: {
    userId: string;
    kycProfileId: string;
    outcome: KycAuditOutcome;
    notes: string | null;
    occurredAt: Date;
    performedByUserId?: string | null;
  }): KycAuditLogEntry {
    return new KycAuditLogEntry({
      id: randomUUID(),
      userId: params.userId,
      kycProfileId: params.kycProfileId,
      eventType: KycAuditEventType.SANCTIONS_SCREENING,
      verificationType: null,
      outcome: params.outcome,
      failureReason: null,
      previousTier: null,
      newTier: null,
      performedByUserId: params.performedByUserId ?? null,
      notes: params.notes,
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

import { Inject, Injectable } from '@nestjs/common';
import {
  KYC_AUDIT_LOG_REPOSITORY,
  IKycAuditLogRepository,
} from '../../domain/repositories/kyc-audit-log.repository.interface';
import { KycAuditLogEntry } from '../../domain/entities/kyc-audit-log-entry.entity';
import { KycAuditOutcome } from '../../domain/enums/kyc-audit-outcome.enum';
import { VerificationType } from '../../domain/enums/verification-type.enum';
import { KycTier } from '../../domain/enums/kyc-tier.enum';
import { VerificationPassedEvent } from '../../domain/events/verification-passed.event';
import { VerificationFailedEvent } from '../../domain/events/verification-failed.event';
import { KycTierUpgradedEvent } from '../../domain/events/kyc-tier-upgraded.event';
import { DomainEvent } from '../../../../shared/events/domain-event.base';

/**
 * Writes the compliance audit trail (modules/compliance/implementation.md,
 * Phase 3) synchronously and awaited, as a direct call from the command
 * handlers that raise these events — not via `EventBus.publish()`.
 *
 * That's a deliberate correction, not the original design: `@nestjs/cqrs`'s
 * `EventBus.publish()` is fire-and-forget — it does not await handler
 * completion, and a thrown error inside an `@EventsHandler` is caught,
 * logged, and dropped (see `EventBus`'s internal `bind()`), never
 * surfaced to the publisher or the HTTP caller. Wiring the audit write
 * as an `@EventsHandler` (the original Phase 3 shape) meant a DB hiccup
 * at exactly the wrong moment could silently and permanently lose an
 * audit row while the verification request still returned 200 OK —
 * directly contradicting "durable answer to prove this user was
 * properly verified." Calling this service directly and awaiting it
 * means an audit-write failure now fails the whole request instead.
 *
 * `KycTierUpgradedEvent` is still also published to the `EventBus` by
 * the command handlers (unchanged) — Accounts' account-activation
 * handler depends on that, and eventual-consistency there is an
 * accepted trade-off unrelated to audit durability.
 */
@Injectable()
export class KycAuditRecorderService {
  constructor(
    @Inject(KYC_AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: IKycAuditLogRepository,
  ) {}

  /** Records whichever of these domain events are audit-relevant; ignores the rest. */
  async recordDomainEvents(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      if (event instanceof VerificationPassedEvent) {
        await this.recordVerificationAttempt(event, KycAuditOutcome.PASSED, null);
      } else if (event instanceof VerificationFailedEvent) {
        await this.recordVerificationAttempt(event, KycAuditOutcome.FAILED, event.reason);
      } else if (event instanceof KycTierUpgradedEvent) {
        await this.recordTierChange(event);
      }
    }
  }

  private async recordVerificationAttempt(
    event: VerificationPassedEvent | VerificationFailedEvent,
    outcome: KycAuditOutcome,
    failureReason: string | null,
  ): Promise<void> {
    const entry = KycAuditLogEntry.forVerificationAttempt({
      userId: event.userId,
      kycProfileId: event.aggregateId,
      verificationType: event.verificationType as VerificationType,
      outcome,
      failureReason,
      occurredAt: event.occurredAt,
    });
    await this.auditLogRepository.save(entry);
  }

  private async recordTierChange(event: KycTierUpgradedEvent): Promise<void> {
    const newTier = event.newTier as KycTier;
    // See KycTierUpgradedEvent's header comment: it only carries the new
    // tier (a public contract Accounts also depends on, so its shape
    // wasn't changed for this). Deriving previousTier is safe only
    // because today's progression is strictly linear — see
    // KycProfile.recordBvnVerified()/recordNinVerified().
    const previousTier = newTier === KycTier.TIER_3 ? KycTier.TIER_2 : KycTier.TIER_1;

    const entry = KycAuditLogEntry.forTierChange({
      userId: event.userId,
      kycProfileId: event.aggregateId,
      previousTier,
      newTier,
      occurredAt: event.occurredAt,
    });
    await this.auditLogRepository.save(entry);
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  KYC_AUDIT_LOG_REPOSITORY,
  IKycAuditLogRepository,
} from '../../domain/repositories/kyc-audit-log.repository.interface';
import { KycAuditLogEntry } from '../../domain/entities/kyc-audit-log-entry.entity';
import { KycTier } from '../../domain/enums/kyc-tier.enum';
import { KycTierUpgradedEvent } from '../../domain/events/kyc-tier-upgraded.event';

/**
 * Persists every tier change to the durable audit trail
 * (modules/compliance/implementation.md, Phase 3).
 *
 * `KycTierUpgradedEvent` only carries the *new* tier (it's a public
 * contract also consumed by Accounts — see that event class's header
 * comment — so its shape isn't changed here). `previousTier` is
 * derived instead, safe only because today's progression is strictly
 * linear (see `KycProfile.recordBvnVerified`/`recordNinVerified`):
 * reaching TIER_2 always comes from TIER_1, and TIER_3 always from
 * TIER_2. If tier progression ever stops being linear (e.g. a
 * skip-tier path), this derivation must be revisited.
 */
@Injectable()
@EventsHandler(KycTierUpgradedEvent)
export class RecordTierChangeAuditHandler implements IEventHandler<KycTierUpgradedEvent> {
  private readonly logger = new Logger(RecordTierChangeAuditHandler.name);

  constructor(
    @Inject(KYC_AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: IKycAuditLogRepository,
  ) {}

  async handle(event: KycTierUpgradedEvent): Promise<void> {
    const newTier = event.newTier as KycTier;
    const previousTier = newTier === KycTier.TIER_3 ? KycTier.TIER_2 : KycTier.TIER_1;

    const entry = KycAuditLogEntry.forTierChange({
      userId: event.userId,
      kycProfileId: event.aggregateId,
      previousTier,
      newTier,
      occurredAt: event.occurredAt,
    });

    await this.auditLogRepository.save(entry);
    this.logger.log(`Recorded tier change ${previousTier} -> ${newTier} for user ${event.userId}`);
  }
}

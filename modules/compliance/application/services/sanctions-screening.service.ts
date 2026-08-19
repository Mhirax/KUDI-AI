import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import {
  SANCTIONS_SCREENING_PROVIDER,
  ISanctionsScreeningProvider,
} from '../../domain/services/sanctions-screening-provider.interface';
import {
  KYC_PROFILE_REPOSITORY,
  IKycProfileRepository,
} from '../../domain/repositories/kyc-profile.repository.interface';
import {
  KYC_AUDIT_LOG_REPOSITORY,
  IKycAuditLogRepository,
} from '../../domain/repositories/kyc-audit-log.repository.interface';
import { KycProfile } from '../../domain/entities/kyc-profile.entity';
import { KycAuditLogEntry } from '../../domain/entities/kyc-audit-log-entry.entity';
import { KycAuditOutcome } from '../../domain/enums/kyc-audit-outcome.enum';

/**
 * Runs sanctions/PEP screening against a confirmed real name and, on a
 * match, opens a review flag (Phase 4 of
 * modules/compliance/implementation.md). Called directly (awaited) from
 * the verification command handlers right after a successful
 * verification — self-service pass or staff manual override — never on
 * an unconfirmed/mismatched name, since screening someone we don't yet
 * know the real identity of isn't meaningful.
 *
 * Writes its own `SANCTIONS_SCREENING` audit row directly for both
 * outcomes (clean and matched) — same reasoning as
 * `KycAuditRecorderService`'s header comment: this must be durable
 * (awaited, not fire-and-forget via `EventBus`), and a match also
 * needs the specific matched-candidate detail in `notes`, which a
 * generic event-driven recorder can't add.
 *
 * Never blocks or fails the verification itself — a match opens a flag
 * for human review (see `ClearSanctionsFlagHandler`), it does not
 * reject or freeze anything automatically. See this module's own
 * README/implementation.md for why: false positives here are cheap to
 * dismiss, but auto-blocking on an unreviewed algorithmic match is not
 * a call software should make alone.
 */
@Injectable()
export class SanctionsScreeningService {
  private readonly logger = new Logger(SanctionsScreeningService.name);

  constructor(
    @Inject(SANCTIONS_SCREENING_PROVIDER) private readonly screeningProvider: ISanctionsScreeningProvider,
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
    @Inject(KYC_AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: IKycAuditLogRepository,
    private readonly eventBus: EventBus,
  ) {}

  async screenAndFlag(profile: KycProfile, fullName: string): Promise<void> {
    const result = await this.screeningProvider.screen(fullName);

    if (!result.matched) {
      const cleanEntry = KycAuditLogEntry.forSanctionsScreening({
        userId: profile.userId,
        kycProfileId: profile.id,
        outcome: KycAuditOutcome.PASSED,
        notes: null,
        occurredAt: new Date(),
      });
      await this.auditLogRepository.save(cleanEntry);
      return;
    }

    const matchSummary = result.matches
      .map((match) => `${match.fullName}${match.program ? ` (${match.program})` : ''}`)
      .join('; ');

    profile.flagForSanctionsReview(matchSummary);
    await this.kycProfileRepository.save(profile);
    const events = profile.pullDomainEvents();

    const flagEntry = KycAuditLogEntry.forSanctionsScreening({
      userId: profile.userId,
      kycProfileId: profile.id,
      outcome: KycAuditOutcome.FAILED,
      notes: `Candidate match(es): ${matchSummary}`,
      occurredAt: new Date(),
    });
    await this.auditLogRepository.save(flagEntry);

    // Not routed through KycAuditRecorderService — this service just
    // wrote the definitive audit row above; publishing here is only
    // for any other future consumer of this event, not for auditing.
    events.forEach((event) => this.eventBus.publish(event));
    this.logger.warn(`Sanctions screening flagged user ${profile.userId}: ${matchSummary}`);
  }
}

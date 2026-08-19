import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ClearSanctionsFlagCommand } from './clear-sanctions-flag.command';
import {
  KYC_PROFILE_REPOSITORY,
  IKycProfileRepository,
} from '../../../domain/repositories/kyc-profile.repository.interface';
import {
  KYC_AUDIT_LOG_REPOSITORY,
  IKycAuditLogRepository,
} from '../../../domain/repositories/kyc-audit-log.repository.interface';
import { KycAuditLogEntry } from '../../../domain/entities/kyc-audit-log-entry.entity';
import { KycAuditOutcome } from '../../../domain/enums/kyc-audit-outcome.enum';
import { KycProfileNotFoundException } from '../../../domain/exceptions/kyc-profile-not-found.exception';
import { KycStatusResponseDto } from '../../dto/kyc-status-response.dto';

/**
 * Use case: a compliance officer resolves an open sanctions flag
 * (Phase 4b of modules/compliance/implementation.md) — the other half
 * of Phase 4's "flag and route to manual review, never a hard silent
 * reject": something has to be able to close the loop, or the review
 * queue only ever grows. `KycProfile.clearSanctionsFlag()` throws if
 * there's no open flag, so this can't be called speculatively.
 *
 * Writes its own audit row directly (same pattern as the manual
 * verification-override handlers) rather than via `KycAuditRecorderService`
 * — `performedByUserId`/`notes` (the reason) are the compliance record
 * of who cleared it and why.
 */
@Injectable()
@CommandHandler(ClearSanctionsFlagCommand)
export class ClearSanctionsFlagHandler
  implements ICommandHandler<ClearSanctionsFlagCommand, KycStatusResponseDto>
{
  constructor(
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
    @Inject(KYC_AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: IKycAuditLogRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ClearSanctionsFlagCommand): Promise<KycStatusResponseDto> {
    const profile = await this.kycProfileRepository.findByUserId(command.targetUserId);
    if (!profile) {
      throw new KycProfileNotFoundException(command.targetUserId);
    }

    profile.clearSanctionsFlag(command.staffUserId, command.reason);
    await this.kycProfileRepository.save(profile);
    const events = profile.pullDomainEvents();

    const clearEntry = KycAuditLogEntry.forSanctionsScreening({
      userId: command.targetUserId,
      kycProfileId: profile.id,
      outcome: KycAuditOutcome.PASSED,
      notes: `Flag cleared by staff. Reason: ${command.reason}.`,
      occurredAt: new Date(),
      performedByUserId: command.staffUserId,
    });
    await this.auditLogRepository.save(clearEntry);

    events.forEach((event) => this.eventBus.publish(event));

    return KycStatusResponseDto.fromDomain(profile);
  }
}

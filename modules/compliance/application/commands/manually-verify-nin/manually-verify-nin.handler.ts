import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ManuallyVerifyNinCommand } from './manually-verify-nin.command';
import {
  KYC_PROFILE_REPOSITORY,
  IKycProfileRepository,
} from '../../../domain/repositories/kyc-profile.repository.interface';
import {
  KYC_AUDIT_LOG_REPOSITORY,
  IKycAuditLogRepository,
} from '../../../domain/repositories/kyc-audit-log.repository.interface';
import {
  IDENTITY_VERIFICATION_PROVIDER,
  IIdentityVerificationProvider,
} from '../../../domain/services/identity-verification-provider.interface';
import { Nin } from '../../../domain/value-objects/nin.vo';
import { VerificationType } from '../../../domain/enums/verification-type.enum';
import { KycAuditOutcome } from '../../../domain/enums/kyc-audit-outcome.enum';
import { KycAuditLogEntry } from '../../../domain/entities/kyc-audit-log-entry.entity';
import { KycTierUpgradedEvent } from '../../../domain/events/kyc-tier-upgraded.event';
import { KycProfileNotFoundException } from '../../../domain/exceptions/kyc-profile-not-found.exception';
import { KycStatusResponseDto } from '../../dto/kyc-status-response.dto';
import { KycAuditRecorderService } from '../../services/kyc-audit-recorder.service';
import { SanctionsScreeningService } from '../../services/sanctions-screening.service';

import {
  USER_REPOSITORY,
  IUserRepository,
} from '../../../../identity/domain/repositories/user.repository.interface';

/**
 * Use case: a compliance officer manually verifies a user's NIN after
 * the automated name-match check failed. Mirrors
 * `ManuallyVerifyBvnHandler` exactly — see that handler's header
 * comment for the full rationale (real provider lookup still required,
 * only the name-match gate is skipped, `reason` is mandatory and
 * recorded). `KycProfile.recordNinVerified()`'s own tier-progression
 * rule (NIN alone only advances to TIER_3 if BVN is already verified)
 * is unchanged and still applies here.
 */
@Injectable()
@CommandHandler(ManuallyVerifyNinCommand)
export class ManuallyVerifyNinHandler
  implements ICommandHandler<ManuallyVerifyNinCommand, KycStatusResponseDto>
{
  constructor(
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
    @Inject(KYC_AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: IKycAuditLogRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(IDENTITY_VERIFICATION_PROVIDER)
    private readonly verificationProvider: IIdentityVerificationProvider,
    private readonly auditRecorder: KycAuditRecorderService,
    private readonly sanctionsScreening: SanctionsScreeningService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ManuallyVerifyNinCommand): Promise<KycStatusResponseDto> {
    const targetUser = await this.userRepository.findById(command.targetUserId);
    if (!targetUser) {
      throw new KycProfileNotFoundException(command.targetUserId);
    }

    const profile = await this.kycProfileRepository.findByUserId(command.targetUserId);
    if (!profile) {
      throw new KycProfileNotFoundException(command.targetUserId);
    }

    const nin = Nin.create(command.nin);

    const result = await this.verificationProvider.verifyNin({
      nin: nin.getValue(),
      expectedFirstName: targetUser.firstName,
      expectedLastName: targetUser.lastName,
    });

    const ninHash = createHash('sha256').update(nin.getValue()).digest('hex');
    profile.recordNinVerified(ninHash, nin.toMasked());
    await this.kycProfileRepository.save(profile);
    const events = profile.pullDomainEvents();

    const overrideEntry = KycAuditLogEntry.forVerificationAttempt({
      userId: command.targetUserId,
      kycProfileId: profile.id,
      verificationType: VerificationType.NIN,
      outcome: KycAuditOutcome.PASSED,
      failureReason: null,
      occurredAt: new Date(),
      performedByUserId: command.staffUserId,
      notes: `Manual override by staff. Reason: ${command.reason}. Provider-returned name: ${result.verifiedFullName ?? 'unavailable'}.`,
    });
    await this.auditLogRepository.save(overrideEntry);

    const tierChangeEvents = events.filter((event) => event instanceof KycTierUpgradedEvent);
    await this.auditRecorder.recordDomainEvents(tierChangeEvents);
    events.forEach((event) => this.eventBus.publish(event));

    // Phase 4 — see ManuallyVerifyBvnHandler's matching comment.
    await this.sanctionsScreening.screenAndFlag(
      profile,
      result.verifiedFullName ?? `${targetUser.firstName} ${targetUser.lastName}`,
    );

    return KycStatusResponseDto.fromDomain(profile);
  }
}

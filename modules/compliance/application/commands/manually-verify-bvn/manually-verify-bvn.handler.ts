import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ManuallyVerifyBvnCommand } from './manually-verify-bvn.command';
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
import { Bvn } from '../../../domain/value-objects/bvn.vo';
import { VerificationType } from '../../../domain/enums/verification-type.enum';
import { KycAuditOutcome } from '../../../domain/enums/kyc-audit-outcome.enum';
import { KycAuditLogEntry } from '../../../domain/entities/kyc-audit-log-entry.entity';
import { KycTierUpgradedEvent } from '../../../domain/events/kyc-tier-upgraded.event';
import { KycProfileNotFoundException } from '../../../domain/exceptions/kyc-profile-not-found.exception';
import { KycStatusResponseDto } from '../../dto/kyc-status-response.dto';
import { KycAuditRecorderService } from '../../services/kyc-audit-recorder.service';

import {
  USER_REPOSITORY,
  IUserRepository,
} from '../../../../identity/domain/repositories/user.repository.interface';

/**
 * Use case: a compliance officer manually verifies a user's BVN after
 * the automated name-match check failed (Phase 5b of
 * modules/compliance/implementation.md).
 *
 * Deliberately re-runs the real provider lookup (`verifyBvn`) rather
 * than trusting a bare "mark as verified" — the BVN must still resolve
 * to a real record, so staff can't push through a fake/unregistered
 * number. What's skipped is only the automated name-match gate
 * (`result.matched` is intentionally never checked here): staff are
 * expected to have confirmed the identity out-of-band (phone call, ID
 * document, etc.) before calling this, and `reason` is required and
 * recorded precisely because this bypasses that automated check.
 *
 * Unlike the self-service path, the resulting `VERIFICATION_ATTEMPT`
 * audit row is written directly here (not via `KycAuditRecorderService`,
 * to avoid a duplicate routine row for the same pass) with
 * `performedByUserId`/`notes` set — the primary compliance record of
 * who did this and why. Any resulting `KycTierUpgradedEvent` is still
 * routed through the normal recorder, and every event is still
 * published to the `EventBus` as usual for other consumers (Accounts'
 * account-activation handler).
 */
@Injectable()
@CommandHandler(ManuallyVerifyBvnCommand)
export class ManuallyVerifyBvnHandler
  implements ICommandHandler<ManuallyVerifyBvnCommand, KycStatusResponseDto>
{
  constructor(
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
    @Inject(KYC_AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: IKycAuditLogRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(IDENTITY_VERIFICATION_PROVIDER)
    private readonly verificationProvider: IIdentityVerificationProvider,
    private readonly auditRecorder: KycAuditRecorderService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ManuallyVerifyBvnCommand): Promise<KycStatusResponseDto> {
    const targetUser = await this.userRepository.findById(command.targetUserId);
    if (!targetUser) {
      throw new KycProfileNotFoundException(command.targetUserId);
    }

    const profile = await this.kycProfileRepository.findByUserId(command.targetUserId);
    if (!profile) {
      throw new KycProfileNotFoundException(command.targetUserId);
    }

    const bvn = Bvn.create(command.bvn);

    // Confirms the BVN is a real, resolvable record — throws
    // VerificationProviderException if not. `result.matched` is
    // deliberately never read; see this class's header comment.
    const result = await this.verificationProvider.verifyBvn({
      bvn: bvn.getValue(),
      expectedFirstName: targetUser.firstName,
      expectedLastName: targetUser.lastName,
    });

    const bvnHash = createHash('sha256').update(bvn.getValue()).digest('hex');
    profile.recordBvnVerified(bvnHash, bvn.toMasked());
    await this.kycProfileRepository.save(profile);
    const events = profile.pullDomainEvents();

    const overrideEntry = KycAuditLogEntry.forVerificationAttempt({
      userId: command.targetUserId,
      kycProfileId: profile.id,
      verificationType: VerificationType.BVN,
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

    return KycStatusResponseDto.fromDomain(profile);
  }
}

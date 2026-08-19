import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { SubmitBvnVerificationCommand } from './submit-bvn-verification.command';
import {
  KYC_PROFILE_REPOSITORY,
  IKycProfileRepository,
} from '../../../domain/repositories/kyc-profile.repository.interface';
import {
  IDENTITY_VERIFICATION_PROVIDER,
  IIdentityVerificationProvider,
} from '../../../domain/services/identity-verification-provider.interface';
import { Bvn } from '../../../domain/value-objects/bvn.vo';
import { VerificationType } from '../../../domain/enums/verification-type.enum';
import { KycProfileNotFoundException } from '../../../domain/exceptions/kyc-profile-not-found.exception';
import { IdentityMismatchException } from '../../../domain/exceptions/identity-mismatch.exception';
import { KycStatusResponseDto } from '../../dto/kyc-status-response.dto';
import { KycAuditRecorderService } from '../../services/kyc-audit-recorder.service';

// Cross-module dependency on Identity's exported port — same pattern
// as Transfers depending on Accounts' ACCOUNT_REPOSITORY.
import {
  USER_REPOSITORY,
  IUserRepository,
} from '../../../../identity/domain/repositories/user.repository.interface';

/**
 * Use case: submit a BVN for verification. The provider's returned
 * name is checked against the user's *registered* name (from
 * Identity) — a mismatch is treated as a failed verification attempt,
 * not merely ignored, since it's the primary defense against someone
 * submitting another person's BVN.
 */
@Injectable()
@CommandHandler(SubmitBvnVerificationCommand)
export class SubmitBvnVerificationHandler
  implements ICommandHandler<SubmitBvnVerificationCommand, KycStatusResponseDto>
{
  constructor(
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(IDENTITY_VERIFICATION_PROVIDER)
    private readonly verificationProvider: IIdentityVerificationProvider,
    private readonly auditRecorder: KycAuditRecorderService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: SubmitBvnVerificationCommand): Promise<KycStatusResponseDto> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new KycProfileNotFoundException(command.userId);
    }

    const profile = await this.kycProfileRepository.findByUserId(command.userId);
    if (!profile) {
      // Should not normally happen — a profile is created automatically
      // on registration (see event-handlers/user-registered.handler.ts).
      throw new KycProfileNotFoundException(command.userId);
    }

    const bvn = Bvn.create(command.bvn);

    const result = await this.verificationProvider.verifyBvn({
      bvn: bvn.getValue(),
      expectedFirstName: user.firstName,
      expectedLastName: user.lastName,
    });

    if (!result.matched) {
      profile.recordVerificationFailed(VerificationType.BVN, 'Provider-returned name did not match');
      await this.kycProfileRepository.save(profile);
      const failureEvents = profile.pullDomainEvents();
      // Awaited and durable (see KycAuditRecorderService's header
      // comment) — done before publishing to EventBus for other
      // consumers, and before the exception below.
      await this.auditRecorder.recordDomainEvents(failureEvents);
      failureEvents.forEach((event) => this.eventBus.publish(event));
      throw new IdentityMismatchException();
    }

    const bvnHash = createHash('sha256').update(bvn.getValue()).digest('hex');
    profile.recordBvnVerified(bvnHash, bvn.toMasked());
    await this.kycProfileRepository.save(profile);
    const successEvents = profile.pullDomainEvents();
    await this.auditRecorder.recordDomainEvents(successEvents);
    successEvents.forEach((event) => this.eventBus.publish(event));

    return KycStatusResponseDto.fromDomain(profile);
  }
}

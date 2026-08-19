import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { SubmitNinVerificationCommand } from './submit-nin-verification.command';
import {
  KYC_PROFILE_REPOSITORY,
  IKycProfileRepository,
} from '../../../domain/repositories/kyc-profile.repository.interface';
import {
  IDENTITY_VERIFICATION_PROVIDER,
  IIdentityVerificationProvider,
} from '../../../domain/services/identity-verification-provider.interface';
import { Nin } from '../../../domain/value-objects/nin.vo';
import { VerificationType } from '../../../domain/enums/verification-type.enum';
import { KycProfileNotFoundException } from '../../../domain/exceptions/kyc-profile-not-found.exception';
import { IdentityMismatchException } from '../../../domain/exceptions/identity-mismatch.exception';
import { KycStatusResponseDto } from '../../dto/kyc-status-response.dto';
import { KycAuditRecorderService } from '../../services/kyc-audit-recorder.service';

import {
  USER_REPOSITORY,
  IUserRepository,
} from '../../../../identity/domain/repositories/user.repository.interface';

/**
 * Use case: submit a NIN for verification. Mirrors
 * `SubmitBvnVerificationHandler` exactly — see that handler's header
 * comment for the name-matching rationale.
 */
@Injectable()
@CommandHandler(SubmitNinVerificationCommand)
export class SubmitNinVerificationHandler
  implements ICommandHandler<SubmitNinVerificationCommand, KycStatusResponseDto>
{
  constructor(
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(IDENTITY_VERIFICATION_PROVIDER)
    private readonly verificationProvider: IIdentityVerificationProvider,
    private readonly auditRecorder: KycAuditRecorderService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: SubmitNinVerificationCommand): Promise<KycStatusResponseDto> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new KycProfileNotFoundException(command.userId);
    }

    const profile = await this.kycProfileRepository.findByUserId(command.userId);
    if (!profile) {
      throw new KycProfileNotFoundException(command.userId);
    }

    const nin = Nin.create(command.nin);

    const result = await this.verificationProvider.verifyNin({
      nin: nin.getValue(),
      expectedFirstName: user.firstName,
      expectedLastName: user.lastName,
    });

    if (!result.matched) {
      profile.recordVerificationFailed(VerificationType.NIN, 'Provider-returned name did not match');
      await this.kycProfileRepository.save(profile);
      const failureEvents = profile.pullDomainEvents();
      // Awaited and durable (see KycAuditRecorderService's header
      // comment) — done before publishing to EventBus for other
      // consumers, and before the exception below.
      await this.auditRecorder.recordDomainEvents(failureEvents);
      failureEvents.forEach((event) => this.eventBus.publish(event));
      throw new IdentityMismatchException();
    }

    const ninHash = createHash('sha256').update(nin.getValue()).digest('hex');
    profile.recordNinVerified(ninHash, nin.toMasked());
    await this.kycProfileRepository.save(profile);
    const successEvents = profile.pullDomainEvents();
    await this.auditRecorder.recordDomainEvents(successEvents);
    successEvents.forEach((event) => this.eventBus.publish(event));

    return KycStatusResponseDto.fromDomain(profile);
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  KYC_AUDIT_LOG_REPOSITORY,
  IKycAuditLogRepository,
} from '../../domain/repositories/kyc-audit-log.repository.interface';
import { KycAuditLogEntry } from '../../domain/entities/kyc-audit-log-entry.entity';
import { KycAuditOutcome } from '../../domain/enums/kyc-audit-outcome.enum';
import { VerificationType } from '../../domain/enums/verification-type.enum';
import { VerificationPassedEvent } from '../../domain/events/verification-passed.event';
import { VerificationFailedEvent } from '../../domain/events/verification-failed.event';

/**
 * Persists every BVN/NIN verification attempt — pass or fail — to the
 * durable audit trail (modules/compliance/implementation.md, Phase 3).
 * Both `KycProfile.recordBvnVerified/recordNinVerified` (pass) and
 * `recordVerificationFailed` (fail) publish one of these two events via
 * the command handlers before returning, so this handler sees every
 * attempt regardless of outcome.
 */
@Injectable()
@EventsHandler(VerificationPassedEvent, VerificationFailedEvent)
export class RecordVerificationAuditHandler
  implements IEventHandler<VerificationPassedEvent | VerificationFailedEvent>
{
  private readonly logger = new Logger(RecordVerificationAuditHandler.name);

  constructor(
    @Inject(KYC_AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: IKycAuditLogRepository,
  ) {}

  async handle(event: VerificationPassedEvent | VerificationFailedEvent): Promise<void> {
    const isFailure = event instanceof VerificationFailedEvent;

    const entry = KycAuditLogEntry.forVerificationAttempt({
      userId: event.userId,
      kycProfileId: event.aggregateId,
      verificationType: event.verificationType as VerificationType,
      outcome: isFailure ? KycAuditOutcome.FAILED : KycAuditOutcome.PASSED,
      failureReason: isFailure ? event.reason : null,
      occurredAt: event.occurredAt,
    });

    await this.auditLogRepository.save(entry);
    this.logger.log(
      `Recorded ${event.verificationType} verification ${isFailure ? 'failure' : 'pass'} for user ${event.userId}`,
    );
  }
}

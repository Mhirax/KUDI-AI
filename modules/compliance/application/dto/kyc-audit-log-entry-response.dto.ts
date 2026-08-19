import { KycAuditLogEntry } from '../../domain/entities/kyc-audit-log-entry.entity';

export class KycAuditLogEntryResponseDto {
  eventType: string;
  verificationType: string | null;
  outcome: string | null;
  failureReason: string | null;
  previousTier: string | null;
  newTier: string | null;
  occurredAt: string;

  static fromDomain(entry: KycAuditLogEntry): KycAuditLogEntryResponseDto {
    const props = entry.toProps();
    return {
      eventType: props.eventType,
      verificationType: props.verificationType,
      outcome: props.outcome,
      failureReason: props.failureReason,
      previousTier: props.previousTier,
      newTier: props.newTier,
      occurredAt: props.createdAt.toISOString(),
    };
  }
}

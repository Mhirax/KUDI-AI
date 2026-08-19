import { KycAuditLogEntry as PrismaKycAuditLogEntry } from '@prisma/client';
import { KycAuditLogEntry } from '../../domain/entities/kyc-audit-log-entry.entity';
import { KycAuditEventType } from '../../domain/enums/kyc-audit-event-type.enum';
import { KycAuditOutcome } from '../../domain/enums/kyc-audit-outcome.enum';
import { VerificationType } from '../../domain/enums/verification-type.enum';
import { KycTier } from '../../domain/enums/kyc-tier.enum';

export class KycAuditLogMapper {
  static toDomain(record: PrismaKycAuditLogEntry): KycAuditLogEntry {
    return KycAuditLogEntry.reconstitute({
      id: record.id,
      userId: record.userId,
      kycProfileId: record.kycProfileId,
      eventType: record.eventType as KycAuditEventType,
      verificationType: record.verificationType as VerificationType | null,
      outcome: record.outcome as KycAuditOutcome | null,
      failureReason: record.failureReason,
      previousTier: record.previousTier as KycTier | null,
      newTier: record.newTier as KycTier | null,
      performedByUserId: record.performedByUserId,
      notes: record.notes,
      createdAt: record.createdAt,
    });
  }

  static toPersistence(entry: KycAuditLogEntry): PrismaKycAuditLogEntry {
    const props = entry.toProps();
    return {
      id: props.id,
      userId: props.userId,
      kycProfileId: props.kycProfileId,
      eventType: props.eventType,
      verificationType: props.verificationType,
      outcome: props.outcome,
      failureReason: props.failureReason,
      previousTier: props.previousTier,
      newTier: props.newTier,
      performedByUserId: props.performedByUserId,
      notes: props.notes,
      createdAt: props.createdAt,
    };
  }
}

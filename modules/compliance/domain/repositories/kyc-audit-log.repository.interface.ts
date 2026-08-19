import { KycAuditLogEntry } from '../entities/kyc-audit-log-entry.entity';

export interface IKycAuditLogRepository {
  save(entry: KycAuditLogEntry): Promise<void>;
  /** Full history for one user, oldest first. */
  findByUserId(userId: string): Promise<KycAuditLogEntry[]>;
}

export const KYC_AUDIT_LOG_REPOSITORY = Symbol('KYC_AUDIT_LOG_REPOSITORY');

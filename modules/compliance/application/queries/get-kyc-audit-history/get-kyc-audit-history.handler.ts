import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetKycAuditHistoryQuery } from './get-kyc-audit-history.query';
import {
  KYC_AUDIT_LOG_REPOSITORY,
  IKycAuditLogRepository,
} from '../../../domain/repositories/kyc-audit-log.repository.interface';
import { KycAuditLogEntryResponseDto } from '../../dto/kyc-audit-log-entry-response.dto';

/**
 * Internal query capability for Phase 3b (modules/compliance/implementation.md).
 * Not yet exposed over HTTP — Phase 5 adds the staff-only endpoint/screen
 * that reads from this, once that phase also builds the role-gating for
 * "compliance staff can look up any user's history" (this query takes a
 * bare userId with no caller-identity check of its own, so it must only
 * ever be reached through an already-authorized surface).
 */
@Injectable()
@QueryHandler(GetKycAuditHistoryQuery)
export class GetKycAuditHistoryHandler
  implements IQueryHandler<GetKycAuditHistoryQuery, KycAuditLogEntryResponseDto[]>
{
  constructor(
    @Inject(KYC_AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: IKycAuditLogRepository,
  ) {}

  async execute(query: GetKycAuditHistoryQuery): Promise<KycAuditLogEntryResponseDto[]> {
    const entries = await this.auditLogRepository.findByUserId(query.userId);
    return entries.map((entry) => KycAuditLogEntryResponseDto.fromDomain(entry));
  }
}

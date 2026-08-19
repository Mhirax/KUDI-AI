import { KycStatusResponseDto } from './kyc-status-response.dto';
import { KycAuditLogEntryResponseDto } from './kyc-audit-log-entry-response.dto';

export class StaffKycLookupResponseDto {
  status: KycStatusResponseDto;
  history: KycAuditLogEntryResponseDto[];
}

import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum LoanApprovalDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ApproveLoanDto {
  @IsUUID()
  loanId: string;

  @IsEnum(LoanApprovalDecision)
  decision: LoanApprovalDecision;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

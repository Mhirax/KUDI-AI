import { IsUUID } from 'class-validator';

export class DisburseLoanDto {
  @IsUUID()
  loanId: string;
}

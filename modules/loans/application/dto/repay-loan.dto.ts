import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

export class RepayLoanDto {
  @IsUUID()
  loanId: string;

  /** Major-unit decimal string. */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a positive decimal with at most 2 dp' })
  amount: string;
}

import { IsInt, IsNotEmpty, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

export class ApplyForLoanDto {
  @IsUUID()
  accountId: string;

  /** Major-unit decimal string, e.g. "50000.00". */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a positive decimal with at most 2 dp' })
  amount: string;

  @IsInt()
  @Min(7)
  @Max(90)
  tenorDays: number;
}

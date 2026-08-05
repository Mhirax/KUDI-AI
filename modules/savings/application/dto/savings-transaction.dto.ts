import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

export class SavingsTransactionDto {
  @IsUUID()
  savingsGoalId: string;

  /** Major-unit decimal string, e.g. "1000.00". */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a positive decimal with at most 2 dp' })
  amount: string;
}

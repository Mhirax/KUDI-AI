import { IsString, IsUUID, Length, Matches } from 'class-validator';

export class InitiateInternalTransferDto {
  @IsUUID()
  sourceAccountId: string;

  @IsUUID()
  destinationAccountId: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a decimal string, e.g. "1500.00"' })
  amount: string;

  @IsString()
  @Length(1, 200)
  narration: string;
}

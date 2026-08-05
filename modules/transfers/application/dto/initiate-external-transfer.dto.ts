import { IsString, IsUUID, Length, Matches } from 'class-validator';

export class InitiateExternalTransferDto {
  @IsUUID()
  sourceAccountId: string;

  @IsString()
  @Matches(/^\d{3}$/, { message: 'bankCode must be a 3-digit CBN bank code' })
  bankCode: string;

  @IsString()
  @Matches(/^\d{10}$/, { message: 'recipientAccountNumber must be 10 digits (NUBAN)' })
  recipientAccountNumber: string;

  @IsString()
  @Length(1, 100)
  recipientAccountName: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a decimal string, e.g. "1500.00"' })
  amount: string;

  @IsString()
  @Length(1, 200)
  narration: string;
}

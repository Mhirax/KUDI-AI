import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

export class InitiateCheckoutDepositDto {
  @IsUUID()
  accountId: string;

  /** Major-unit decimal string, e.g. "1500.00" — same convention as Accounts/Transfers DTOs. */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a positive decimal with at most 2 dp' })
  amount: string;
}

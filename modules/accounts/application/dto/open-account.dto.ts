import { IsEnum, IsOptional } from 'class-validator';
import { AccountType } from '../../domain/enums/account-type.enum';
import { Currency } from '../../../../shared/enums/currency.enum';

export class OpenAccountDto {
  @IsEnum(AccountType)
  accountType: AccountType;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency = Currency.NGN;
}

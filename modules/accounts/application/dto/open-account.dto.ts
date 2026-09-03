import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { AccountType, CUSTOMER_ACCOUNT_TYPES } from '../../domain/enums/account-type.enum';
import { Currency } from '../../../../shared/enums/currency.enum';

export class OpenAccountDto {
  /**
   * Restricted to the customer-selectable products rather than the whole
   * AccountType enum. The enum also carries Kudi's own SYSTEM_* accounts,
   * and `@IsEnum(AccountType)` would let any authenticated caller open a
   * settlement or fee-revenue account in their own name.
   */
  @IsIn(CUSTOMER_ACCOUNT_TYPES as AccountType[])
  accountType: AccountType;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency = Currency.NGN;
}

import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { Currency } from '../../../../shared/enums/currency.enum';

export class DebitAccountDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a decimal string, e.g. "1500.00"' })
  amount: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency = Currency.NGN;

  @IsString()
  reference: string;
}

import { IsEnum, IsNotEmpty, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { BillCategory } from '../../domain/enums/bill-category.enum';

export class InitiateBillPaymentDto {
  @IsUUID()
  accountId: string;

  @IsEnum(BillCategory)
  category: BillCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  billerCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  itemCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  billerName: string;

  /** Phone number / meter number / smartcard number, per category. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  customerIdentifier: string;

  /** Major-unit decimal string, e.g. "1000.00". */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a positive decimal with at most 2 dp' })
  amount: string;
}

import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RedemptionType } from '../../domain/enums/redemption-type.enum';

export class RedeemRewardsDto {
  @IsEnum(RedemptionType)
  redemptionType: RedemptionType;

  @IsInt()
  @Min(1)
  points: number;

  /** Required when redemptionType is CASHBACK: the wallet to credit. */
  @IsOptional()
  @IsString()
  accountId?: string;

  /** Required when redemptionType is AIRTIME/DATA: which biller to pay. */
  @IsOptional()
  @IsString()
  billerCode?: string;

  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsOptional()
  @IsString()
  billerName?: string;

  /** Phone number to top up, required for AIRTIME/DATA redemption. */
  @IsOptional()
  @IsString()
  customerIdentifier?: string;
}

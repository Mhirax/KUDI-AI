import { IsNotEmpty, IsString } from 'class-validator';

export class RedeemReferralDto {
  @IsString()
  @IsNotEmpty()
  referralCode: string;
}

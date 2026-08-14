import { IsString, Matches } from 'class-validator';

export class SubmitBvnVerificationDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: 'bvn must be exactly 11 digits' })
  bvn: string;
}

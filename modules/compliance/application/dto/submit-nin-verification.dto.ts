import { IsString, Matches } from 'class-validator';

export class SubmitNinVerificationDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: 'nin must be exactly 11 digits' })
  nin: string;
}

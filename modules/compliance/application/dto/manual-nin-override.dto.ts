import { IsString, Matches, MinLength } from 'class-validator';

export class ManualNinOverrideDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: 'nin must be exactly 11 digits' })
  nin: string;

  @IsString()
  @MinLength(10, { message: 'reason must be at least 10 characters — record the actual justification' })
  reason: string;
}

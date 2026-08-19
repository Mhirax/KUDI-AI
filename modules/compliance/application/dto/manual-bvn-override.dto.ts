import { IsString, Matches, MinLength } from 'class-validator';

export class ManualBvnOverrideDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: 'bvn must be exactly 11 digits' })
  bvn: string;

  @IsString()
  @MinLength(10, { message: 'reason must be at least 10 characters — record the actual justification' })
  reason: string;
}

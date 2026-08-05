import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateSavingsGoalDto {
  @IsUUID()
  sourceAccountId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  /** Major-unit decimal string, e.g. "50000.00". Omit for an open-ended, no-target goal. */
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'targetAmount must be a positive decimal with at most 2 dp',
  })
  targetAmount?: string;
}

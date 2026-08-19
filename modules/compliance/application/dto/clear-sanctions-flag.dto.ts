import { IsString, MinLength } from 'class-validator';

export class ClearSanctionsFlagDto {
  @IsString()
  @MinLength(10, { message: 'reason must be at least 10 characters — record the actual justification' })
  reason: string;
}

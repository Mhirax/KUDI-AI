import { IsString, Length } from 'class-validator';

export class FreezeAccountDto {
  @IsString()
  @Length(3, 500)
  reason: string;
}

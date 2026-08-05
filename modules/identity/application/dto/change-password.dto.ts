import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @Length(12, 128)
  newPassword: string;
}

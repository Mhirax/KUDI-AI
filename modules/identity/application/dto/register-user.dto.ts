import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'phoneNumber must be in E.164 format, e.g. +2348012345678' })
  phoneNumber: string;

  @IsString()
  @Length(8, 128)
  password: string;

  @IsString()
  @Length(1, 100)
  firstName: string;

  @IsString()
  @Length(1, 100)
  lastName: string;
}

import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ValidateBillCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  billerCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  itemCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  customerIdentifier: string;
}

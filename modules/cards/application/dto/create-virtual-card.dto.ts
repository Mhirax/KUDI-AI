import { IsUUID } from 'class-validator';

export class CreateVirtualCardDto {
  @IsUUID()
  accountId: string;
}

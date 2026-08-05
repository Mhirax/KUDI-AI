import { IsUUID } from 'class-validator';

export class RequestPhysicalCardDto {
  @IsUUID()
  accountId: string;
}

import { IsUUID } from 'class-validator';

export class CreateVirtualAccountDto {
  /** The Kudi wallet account the new virtual account number should fund. */
  @IsUUID()
  accountId: string;
}

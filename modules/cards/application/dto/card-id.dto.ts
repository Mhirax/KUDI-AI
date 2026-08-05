import { IsUUID } from 'class-validator';

/** Shared body shape for freeze/unfreeze/terminate — id-only actions. */
export class CardIdDto {
  @IsUUID()
  cardId: string;
}

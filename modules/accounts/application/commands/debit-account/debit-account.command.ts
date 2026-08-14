import { Currency } from '../../../../../shared/enums/currency.enum';

export class DebitAccountCommand {
  constructor(
    readonly accountId: string,
    readonly amount: string,
    readonly currency: Currency,
    readonly reference: string,
  ) {}
}

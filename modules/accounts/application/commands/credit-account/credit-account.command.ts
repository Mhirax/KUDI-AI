import { Currency } from '../../../../../shared/enums/currency.enum';

export class CreditAccountCommand {
  constructor(
    readonly accountId: string,
    readonly amount: string, // decimal major-unit string, e.g. "1500.00"
    readonly currency: Currency,
    readonly reference: string,
  ) {}
}

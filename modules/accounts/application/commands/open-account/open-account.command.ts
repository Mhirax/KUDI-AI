import { AccountType } from '../../../domain/enums/account-type.enum';
import { Currency } from '../../../../../shared/enums/currency.enum';

export class OpenAccountCommand {
  constructor(
    readonly userId: string,
    readonly accountType: AccountType,
    readonly currency: Currency,
  ) {}
}

import { BillCategory } from '../../../domain/enums/bill-category.enum';

export class InitiateBillPaymentCommand {
  constructor(
    readonly userId: string,
    readonly accountId: string,
    readonly category: BillCategory,
    readonly billerCode: string,
    readonly itemCode: string,
    readonly billerName: string,
    readonly customerIdentifier: string,
    /** Major-unit decimal string. */
    readonly amount: string,
  ) {}
}

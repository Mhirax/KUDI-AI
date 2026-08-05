import { Biller } from '../../domain/services/bill-payment-provider.interface';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

export class BillerResponseDto {
  billerCode: string;
  itemCode: string;
  name: string;
  category: string;
  /** Major-unit decimal string for fixed-price items; null when the customer chooses the amount. */
  fixedAmount: string | null;

  static fromDomain(biller: Biller): BillerResponseDto {
    return {
      billerCode: biller.billerCode,
      itemCode: biller.itemCode,
      name: biller.name,
      category: biller.category,
      fixedAmount:
        biller.fixedAmountMinorUnits !== null
          ? Money.fromMinorUnits(biller.fixedAmountMinorUnits, Currency.NGN).toMajorUnitsString()
          : null,
    };
  }
}

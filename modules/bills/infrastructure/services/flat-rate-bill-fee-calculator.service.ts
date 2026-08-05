import { Injectable } from '@nestjs/common';
import { IBillFeeCalculator } from '../../domain/services/bill-fee-calculator.interface';
import { Money } from '../../../../shared/value-objects/money.vo';
import { BillCategory } from '../../domain/enums/bill-category.enum';

/**
 * Flat bill-payment fee schedule — the Bills-side analogue of
 * Transfers' FlatRateFeeCalculator and the same named seam for the
 * Rust `fee-engine`.
 *
 * Schedule (illustrative, not final pricing): airtime and data are
 * free (standard Nigerian market expectation); utility/TV/internet
 * bills carry a flat ₦50 convenience fee.
 */
@Injectable()
export class FlatRateBillFeeCalculator implements IBillFeeCalculator {
  async calculate(amount: Money, category: BillCategory): Promise<Money> {
    const currency = amount.getCurrency();

    if (category === BillCategory.AIRTIME || category === BillCategory.MOBILE_DATA) {
      return Money.zero(currency);
    }

    return Money.fromDecimalString('50.00', currency);
  }
}

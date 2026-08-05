import { Injectable } from '@nestjs/common';
import { IFeeCalculator } from '../../domain/services/fee-calculator.interface';
import { Money } from '../../../../shared/value-objects/money.vo';
import { TransferType } from '../../domain/enums/transfer-type.enum';

/**
 * Simple flat/tiered fee schedule, intentionally minimal — this is the
 * named seam where the Rust `fee-engine` (see /rust/fee-engine) will
 * be integrated via gRPC once that contract is finalized. Callers
 * depend only on `IFeeCalculator`, so swapping this implementation
 * requires no change anywhere else in the Transfers module.
 *
 * Schedule (illustrative, not final pricing):
 * - Internal transfers: free (₦0), to encourage in-network movement.
 * - External payouts: flat ₦10 up to ₦5,000; ₦25 up to ₦50,000; ₦50 above.
 */
@Injectable()
export class FlatRateFeeCalculator implements IFeeCalculator {
  async calculate(amount: Money, transferType: TransferType): Promise<Money> {
    const currency = amount.getCurrency();

    if (transferType === TransferType.INTERNAL) {
      return Money.zero(currency);
    }

    const majorUnits = Number(amount.toMajorUnitsString());

    if (majorUnits <= 5000) {
      return Money.fromDecimalString('10.00', currency);
    }
    if (majorUnits <= 50000) {
      return Money.fromDecimalString('25.00', currency);
    }
    return Money.fromDecimalString('50.00', currency);
  }
}

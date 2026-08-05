import { Money } from '../../../../shared/value-objects/money.vo';
import { BillCategory } from '../enums/bill-category.enum';

/**
 * Port for bill-payment fee calculation — the Bills-side analogue of
 * Transfers' IFeeCalculator, and the same named seam where the Rust
 * `fee-engine` will eventually plug in.
 */
export interface IBillFeeCalculator {
  calculate(amount: Money, category: BillCategory): Promise<Money>;
}

export const BILL_FEE_CALCULATOR = Symbol('BILL_FEE_CALCULATOR');

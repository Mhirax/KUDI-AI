import { Money } from '../../../../shared/value-objects/money.vo';

/**
 * Port for loan fee calculation. Same named seam pattern as Transfers'
 * IFeeCalculator / Bills' IBillFeeCalculator.
 */
export interface ILoanFeeCalculator {
  calculate(principal: Money, tenorDays: number): Promise<Money>;
}

export const LOAN_FEE_CALCULATOR = Symbol('LOAN_FEE_CALCULATOR');

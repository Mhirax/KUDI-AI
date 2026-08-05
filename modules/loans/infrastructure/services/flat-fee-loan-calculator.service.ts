import { Injectable } from '@nestjs/common';
import { ILoanFeeCalculator } from '../../domain/services/loan-fee-calculator.interface';
import { Money } from '../../../../shared/value-objects/money.vo';

/**
 * v1 pricing is a single flat 10% fee on principal, regardless of
 * tenor — simplified from an earlier two-tier "Quick Loan / Business
 * Loan" concept into one scheme for launch (see module README). Tenor
 * is still captured and enforced (7-90 days) so a real interest curve
 * can be layered in later without an API/schema change.
 */
@Injectable()
export class FlatFeeLoanCalculator implements ILoanFeeCalculator {
  /** 10% flat fee, expressed as a bigint numerator/denominator to keep all arithmetic exact. */
  private static readonly FLAT_FEE_RATE_NUMERATOR = 10n;
  private static readonly FLAT_FEE_RATE_DENOMINATOR = 100n;

  /**
   * Interface contract is async (a future tiered/interest-based
   * calculator may call an external pricing service); this
   * implementation is synchronous math, matching
   * FlatRateBillFeeCalculator's identical shape.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async calculate(principal: Money, _tenorDays: number): Promise<Money> {
    const feeMinorUnits =
      (principal.getMinorUnits() * FlatFeeLoanCalculator.FLAT_FEE_RATE_NUMERATOR) /
      FlatFeeLoanCalculator.FLAT_FEE_RATE_DENOMINATOR;
    return Money.fromMinorUnits(feeMinorUnits, principal.getCurrency());
  }
}

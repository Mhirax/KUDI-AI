import { Injectable } from '@nestjs/common';
import { IRewardPointsCalculator } from '../../domain/services/reward-points-calculator.interface';

/**
 * Flat earn/redeem rate schedule (illustrative, not final pricing —
 * same disclaimer style as Bills' FlatRateBillFeeCalculator):
 * 1 point per ₦100 spent/funded; 1 point = ₦1 on redemption. Both
 * sides of the rate are intentionally simple integers so point
 * balances and their Naira value are always exact, no rounding drift.
 */
@Injectable()
export class RateBasedRewardPointsCalculator implements IRewardPointsCalculator {
  private static readonly MINOR_UNITS_PER_POINT = 10_000n; // ₦100.00 in kobo
  private static readonly MINOR_UNITS_PER_POINT_REDEMPTION = 100n; // ₦1.00 in kobo

  calculatePointsForAmount(amountMinorUnits: bigint): number {
    const points = amountMinorUnits / RateBasedRewardPointsCalculator.MINOR_UNITS_PER_POINT;
    return Number(points);
  }

  calculateRedemptionValueMinorUnits(points: number): bigint {
    return BigInt(points) * RateBasedRewardPointsCalculator.MINOR_UNITS_PER_POINT_REDEMPTION;
  }
}

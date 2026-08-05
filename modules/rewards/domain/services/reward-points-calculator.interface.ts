/**
 * Port for converting a Naira spend/funding amount into reward
 * points, and points into a Naira redemption value. The same named
 * seam pattern as Transfers' IFeeCalculator / Bills' IBillFeeCalculator.
 */
export interface IRewardPointsCalculator {
  /** amountMinorUnits -> points earned. */
  calculatePointsForAmount(amountMinorUnits: bigint): number;
  /** points -> Naira value in minor units, for CASHBACK/AIRTIME/DATA redemption. */
  calculateRedemptionValueMinorUnits(points: number): bigint;
}

export const REWARD_POINTS_CALCULATOR = Symbol('REWARD_POINTS_CALCULATOR');

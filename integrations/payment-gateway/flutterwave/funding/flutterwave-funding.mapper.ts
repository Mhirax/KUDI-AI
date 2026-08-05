import { FlutterwaveTransactionData } from './flutterwave-funding.dto';
import { MINOR_UNIT_MULTIPLIER } from '../../../../shared/constants';

/**
 * Translation helpers between Flutterwave's funding-side payloads and
 * platform-level primitives. Flutterwave reports amounts in *major*
 * units as JSON numbers; these helpers convert to exact minor-unit
 * bigints at the boundary so no float arithmetic ever reaches a
 * domain object.
 */
export class FlutterwaveFundingMapper {
  static isTerminalSuccess(data: FlutterwaveTransactionData): boolean {
    return data.status?.toLowerCase() === 'successful';
  }

  static extractProviderTransactionId(data: FlutterwaveTransactionData): string {
    return String(data.id);
  }

  /**
   * `amount` arrives as a major-unit JSON number (e.g. 1500.5). Convert
   * via string manipulation — never `amount * 100` float math.
   */
  static amountToMinorUnits(amount: number): bigint {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Invalid provider amount: ${amount}`);
    }
    const [whole, fraction = ''] = amount.toFixed(2).split('.');
    return BigInt(whole) * BigInt(MINOR_UNIT_MULTIPLIER) + BigInt(fraction);
  }
}

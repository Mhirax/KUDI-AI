/**
 * Helpers for safely working with monetary values in minor units
 * (kobo/cents) to avoid floating-point precision defects.
 */
export class MoneyHelper {
  static toMinorUnits(amount: number): number {
    return Math.round(amount * 100);
  }

  static toMajorUnits(minorUnits: number): number {
    return minorUnits / 100;
  }

  static format(minorUnits: number, currency = 'NGN'): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
    }).format(this.toMajorUnits(minorUnits));
  }
}

import { DomainException } from '../exceptions/domain.exception';
import { Currency } from '../enums/currency.enum';

/**
 * Money Value Object.
 *
 * Amounts are stored as `bigint` minor units (kobo/cents) — never
 * `number` — so that ledger arithmetic at scale can never suffer
 * floating-point rounding drift, and never silently overflows
 * `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991) the way large
 * cumulative balances eventually could. All arithmetic enforces
 * matching currencies; there is no implicit conversion — FX is a
 * distinct, explicit operation to be introduced by a future module.
 */
export class Money {
  private constructor(
    private readonly minorUnits: bigint,
    private readonly currency: Currency,
  ) {}

  static fromMinorUnits(minorUnits: bigint | number | string, currency: Currency): Money {
    const value = typeof minorUnits === 'bigint' ? minorUnits : BigInt(minorUnits);
    if (value < 0n) {
      throw new DomainException('Money amount cannot be negative', 'INVALID_MONEY_AMOUNT');
    }
    return new Money(value, currency);
  }

  static zero(currency: Currency): Money {
    return new Money(0n, currency);
  }

  /**
   * Parses a decimal major-unit string (e.g. "1500.00") into exact
   * minor units without ever routing through floating-point `number`,
   * which is how API request bodies (JSON strings) become `Money`.
   */
  static fromDecimalString(decimal: string, currency: Currency): Money {
    if (!/^\d+(\.\d{1,2})?$/.test(decimal)) {
      throw new DomainException(`Invalid decimal amount: ${decimal}`, 'INVALID_MONEY_AMOUNT');
    }
    const [wholePart, fractionalPart = ''] = decimal.split('.');
    const paddedFraction = fractionalPart.padEnd(2, '0');
    const minorUnits = BigInt(wholePart) * 100n + BigInt(paddedFraction);
    return new Money(minorUnits, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (this.minorUnits < other.minorUnits) {
      throw new DomainException(
        'Cannot subtract an amount greater than the available balance',
        'NEGATIVE_MONEY_RESULT',
      );
    }
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  isGreaterThanOrEqualTo(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.minorUnits >= other.minorUnits;
  }

  isZero(): boolean {
    return this.minorUnits === 0n;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.minorUnits === other.minorUnits;
  }

  getMinorUnits(): bigint {
    return this.minorUnits;
  }

  getCurrency(): Currency {
    return this.currency;
  }

  /** Major-unit decimal string, e.g. "1999.00" for 199900 kobo — display/API use only. */
  toMajorUnitsString(): string {
    const negative = this.minorUnits < 0n;
    const abs = negative ? -this.minorUnits : this.minorUnits;
    const major = abs / 100n;
    const minor = (abs % 100n).toString().padStart(2, '0');
    return `${negative ? '-' : ''}${major}.${minor}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainException(
        `Currency mismatch: ${this.currency} vs ${other.currency}`,
        'CURRENCY_MISMATCH',
      );
    }
  }
}

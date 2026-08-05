import { randomBytes } from 'crypto';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

const REFERENCE_REGEX = /^KUDI-BILL-[A-Z0-9]{12}$/;

/**
 * BillReference Value Object. Channel-distinct prefix (`KUDI-BILL-`)
 * so the Ledger classifies bill-payment entries from the reference
 * alone; sent to Flutterwave as our bill payment reference.
 */
export class BillReference {
  private constructor(private readonly value: string) {}

  static generate(): BillReference {
    const random = randomBytes(6).toString('hex').toUpperCase();
    return new BillReference(`KUDI-BILL-${random}`);
  }

  static create(rawReference: string): BillReference {
    if (!rawReference || !REFERENCE_REGEX.test(rawReference)) {
      throw new DomainException(
        `Invalid bill reference: ${rawReference}`,
        'INVALID_BILL_REFERENCE',
      );
    }
    return new BillReference(rawReference);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: BillReference): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

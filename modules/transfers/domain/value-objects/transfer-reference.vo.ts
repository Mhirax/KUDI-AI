import { randomBytes } from 'crypto';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

const REFERENCE_REGEX = /^KUDI-[A-Z0-9]{16}$/;

/**
 * TransferReference Value Object.
 *
 * Doubles as the platform's idempotency key for transfer initiation:
 * callers may safely retry a request with the same reference without
 * risking a duplicate transfer (enforced by a unique constraint at the
 * persistence layer). Also the identifier surfaced to customers and
 * sent to Flutterwave as our external reference for external payouts.
 */
export class TransferReference {
  private constructor(private readonly value: string) {}

  static generate(): TransferReference {
    const random = randomBytes(8).toString('hex').toUpperCase();
    return new TransferReference(`KUDI-${random}`);
  }

  static create(rawReference: string): TransferReference {
    if (!rawReference || !REFERENCE_REGEX.test(rawReference)) {
      throw new DomainException(
        `Invalid transfer reference: ${rawReference}`,
        'INVALID_TRANSFER_REFERENCE',
      );
    }
    return new TransferReference(rawReference);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: TransferReference): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

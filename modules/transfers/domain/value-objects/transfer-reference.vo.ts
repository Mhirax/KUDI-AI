import { randomBytes } from 'crypto';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

const REFERENCE_REGEX = /^KUDI-[A-Z0-9]{16}$/;

/**
 * TransferReference Value Object.
 *
 * A unique, server-generated identifier for one Transfer row — the
 * value shown to customers and sent to Flutterwave as our external
 * reference for external payouts. NOT a retry-safety mechanism: a new
 * one is generated on every call, retry or not, so it cannot detect a
 * duplicate request. Request-level retry safety is
 * shared/idempotency's job (client-supplied `x-idempotency-key`,
 * checked before this reference is ever generated).
 */
export class TransferReference {
  private constructor(private readonly value: string) {}

  static generate(): TransferReference {
    const random = randomBytes(8).toString('hex').toUpperCase();
    return new TransferReference(`KUDI-${random}`);
  }

  static create(rawReference: string): TransferReference {
    if (!rawReference || !REFERENCE_REGEX.test(rawReference)) {
      throw new DomainException(`Invalid transfer reference: ${rawReference}`, 'INVALID_TRANSFER_REFERENCE');
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

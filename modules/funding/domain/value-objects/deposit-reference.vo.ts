import { randomBytes } from 'crypto';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

const REFERENCE_REGEX = /^KUDI-DEP-[A-Z0-9]{12}$/;

/**
 * DepositReference Value Object. Same role as Transfers'
 * TransferReference, with a channel-distinct prefix (`KUDI-DEP-`) so
 * the Ledger module can classify deposit entries without any coupling
 * beyond the reference string itself. Sent to Flutterwave as our
 * `tx_ref` for checkout deposits.
 */
export class DepositReference {
  private constructor(private readonly value: string) {}

  static generate(): DepositReference {
    const random = randomBytes(6).toString('hex').toUpperCase();
    return new DepositReference(`KUDI-DEP-${random}`);
  }

  static create(rawReference: string): DepositReference {
    if (!rawReference || !REFERENCE_REGEX.test(rawReference)) {
      throw new DomainException(
        `Invalid deposit reference: ${rawReference}`,
        'INVALID_DEPOSIT_REFERENCE',
      );
    }
    return new DepositReference(rawReference);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: DepositReference): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

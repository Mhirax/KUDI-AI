import { DomainException } from '../../../../shared/exceptions/domain.exception';

const NUBAN_REGEX = /^\d{10}$/;

/**
 * AccountNumber Value Object.
 *
 * Validates the Nigerian NUBAN (Nigeria Uniform Bank Account Number)
 * 10-digit format. Generation of a checksum-valid number is a separate
 * concern owned by `IAccountNumberGenerator` (a domain port) — this
 * value object only guarantees that whatever number ends up on an
 * `Account` is structurally well-formed.
 */
export class AccountNumber {
  private constructor(private readonly value: string) {}

  static create(rawNumber: string): AccountNumber {
    if (!rawNumber || !NUBAN_REGEX.test(rawNumber)) {
      throw new DomainException(
        `Invalid account number, expected 10 digits (NUBAN): ${rawNumber}`,
        'INVALID_ACCOUNT_NUMBER',
      );
    }
    return new AccountNumber(rawNumber);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: AccountNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

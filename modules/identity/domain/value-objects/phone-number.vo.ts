import { DomainException } from '../../../../shared/exceptions/domain.exception';

// E.164 international format, e.g. +2348012345678
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

/**
 * PhoneNumber Value Object.
 *
 * Stored strictly in E.164 format so downstream integrations
 * (Flutterwave, SMS OTP providers) never receive ambiguous formats.
 */
export class PhoneNumber {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(rawNumber: string): PhoneNumber {
    const normalized = rawNumber?.trim().replace(/[\s-]/g, '');

    if (!normalized || !E164_REGEX.test(normalized)) {
      throw new DomainException(
        `Invalid phone number, expected E.164 format: ${rawNumber}`,
        'INVALID_PHONE_NUMBER',
      );
    }

    return new PhoneNumber(normalized);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

import { DomainException } from '../../../../shared/exceptions/domain.exception';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email Value Object.
 *
 * Enforces format validity and case-insensitive normalization at
 * construction time so that an invalid or inconsistently-cased email
 * can never exist anywhere else in the domain.
 */
export class Email {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(rawEmail: string): Email {
    const normalized = rawEmail?.trim().toLowerCase();

    if (!normalized || !EMAIL_REGEX.test(normalized)) {
      throw new DomainException(`Invalid email address: ${rawEmail}`, 'INVALID_EMAIL');
    }

    if (normalized.length > 254) {
      throw new DomainException('Email address exceeds maximum length', 'INVALID_EMAIL');
    }

    return new Email(normalized);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

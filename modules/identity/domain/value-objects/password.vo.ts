import { DomainException } from '../../../../shared/exceptions/domain.exception';

const MIN_LENGTH = 12;
const HAS_UPPER = /[A-Z]/;
const HAS_LOWER = /[a-z]/;
const HAS_NUMBER = /\d/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

/**
 * PlainPassword Value Object — validates strength rules for a raw,
 * not-yet-hashed password supplied by the user. Never persisted;
 * exists only transiently during registration/change-password flows.
 */
export class PlainPassword {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(rawPassword: string): PlainPassword {
    if (
      !rawPassword ||
      rawPassword.length < MIN_LENGTH ||
      !HAS_UPPER.test(rawPassword) ||
      !HAS_LOWER.test(rawPassword) ||
      !HAS_NUMBER.test(rawPassword) ||
      !HAS_SPECIAL.test(rawPassword)
    ) {
      throw new DomainException(
        `Password must be at least ${MIN_LENGTH} characters and include upper, lower, numeric, and special characters`,
        'WEAK_PASSWORD',
      );
    }

    return new PlainPassword(rawPassword);
  }

  getValue(): string {
    return this.value;
  }
}

/**
 * HashedPassword Value Object — wraps an already-hashed password
 * (bcrypt) for safe storage/transport within the domain. The domain
 * never knows or cares which hashing algorithm produced it; that is an
 * infrastructure concern (see IPasswordHasher).
 */
export class HashedPassword {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static fromHash(hash: string): HashedPassword {
    if (!hash) {
      throw new DomainException('Password hash cannot be empty', 'INVALID_PASSWORD_HASH');
    }
    return new HashedPassword(hash);
  }

  getValue(): string {
    return this.value;
  }
}

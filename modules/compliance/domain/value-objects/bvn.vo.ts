import { DomainException } from '../../../../shared/exceptions/domain.exception';

const BVN_REGEX = /^\d{11}$/;

/**
 * Bank Verification Number Value Object.
 *
 * BVN is highly sensitive PII. This value object exists only
 * transiently during the verification flow — the raw value is sent to
 * the verification provider and then discarded; only a keyed
 * HMAC-SHA256 digest (for deduplication, see
 * domain/services/identifier-hasher.interface.ts) and a masked display
 * form are ever persisted (see infrastructure/mappers/kyc-profile.mapper.ts).
 * Never log or persist the raw value.
 */
export class Bvn {
  private constructor(private readonly value: string) {}

  static create(rawBvn: string): Bvn {
    if (!rawBvn || !BVN_REGEX.test(rawBvn)) {
      throw new DomainException('BVN must be exactly 11 digits', 'INVALID_BVN');
    }
    return new Bvn(rawBvn);
  }

  getValue(): string {
    return this.value;
  }

  /** Last 4 digits only — safe for display/audit, never the full number. */
  toMasked(): string {
    return `*******${this.value.slice(-4)}`;
  }
}

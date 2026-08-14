import { DomainException } from '../../../../shared/exceptions/domain.exception';

const NIN_REGEX = /^\d{11}$/;

/**
 * National Identification Number Value Object. Same sensitivity and
 * handling rules as `Bvn` — see that file's header comment.
 */
export class Nin {
  private constructor(private readonly value: string) {}

  static create(rawNin: string): Nin {
    if (!rawNin || !NIN_REGEX.test(rawNin)) {
      throw new DomainException('NIN must be exactly 11 digits', 'INVALID_NIN');
    }
    return new Nin(rawNin);
  }

  getValue(): string {
    return this.value;
  }

  toMasked(): string {
    return `*******${this.value.slice(-4)}`;
  }
}

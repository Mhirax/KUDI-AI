import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Raised when the name returned by the verification provider for a
 * submitted BVN/NIN does not match the user's registered name — the
 * central defense against someone submitting another person's
 * identity number. Deliberately vague in its message (never echoes
 * back the mismatched names) to avoid leaking PII into logs/responses.
 */
export class IdentityMismatchException extends DomainException {
  public readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor() {
    super(
      'The identity details returned by the verification provider do not match your registered name',
      'IDENTITY_MISMATCH',
    );
    this.name = 'IdentityMismatchException';
  }
}

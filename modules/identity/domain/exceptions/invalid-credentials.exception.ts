import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Deliberately generic message — never reveal whether the email or the
 * password was the incorrect element, to avoid user enumeration.
 */
export class InvalidCredentialsException extends DomainException {
  public readonly httpStatus = HttpStatus.UNAUTHORIZED;

  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS');
    this.name = 'InvalidCredentialsException';
  }
}

import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class InvalidRefreshTokenException extends DomainException {
  public readonly httpStatus = HttpStatus.UNAUTHORIZED;

  constructor() {
    super('Refresh token is invalid, expired, or has already been used', 'INVALID_REFRESH_TOKEN');
    this.name = 'InvalidRefreshTokenException';
  }
}

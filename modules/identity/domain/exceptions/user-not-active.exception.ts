import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class UserNotActiveException extends DomainException {
  public readonly httpStatus = HttpStatus.FORBIDDEN;

  constructor(status: string) {
    super(`User account is not active (current status: ${status})`, 'USER_NOT_ACTIVE');
    this.name = 'UserNotActiveException';
  }
}

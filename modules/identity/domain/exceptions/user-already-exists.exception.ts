import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class UserAlreadyExistsException extends DomainException {
  public readonly httpStatus = HttpStatus.CONFLICT;

  constructor(email: string) {
    super(`A user with email ${email} already exists`, 'USER_ALREADY_EXISTS');
    this.name = 'UserAlreadyExistsException';
  }
}

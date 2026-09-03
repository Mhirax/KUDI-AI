import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class UserAlreadyExistsException extends DomainException {
  public readonly httpStatus = HttpStatus.CONFLICT;

  /**
   * `field` names which unique identifier collided. Email and phone number
   * are both unique in the schema, and someone told only that "a user already
   * exists" cannot tell which of the two they need to change.
   */
  constructor(value: string, field: 'email' | 'phone number' = 'email') {
    super(`A user with ${field} ${value} already exists`, 'USER_ALREADY_EXISTS');
    this.name = 'UserAlreadyExistsException';
  }
}

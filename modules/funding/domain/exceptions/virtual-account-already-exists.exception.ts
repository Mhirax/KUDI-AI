import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class VirtualAccountAlreadyExistsException extends DomainException {
  public override readonly httpStatus = HttpStatus.CONFLICT;

  constructor(accountId: string) {
    super(
      `Account ${accountId} already has a virtual account number`,
      'VIRTUAL_ACCOUNT_ALREADY_EXISTS',
    );
  }
}

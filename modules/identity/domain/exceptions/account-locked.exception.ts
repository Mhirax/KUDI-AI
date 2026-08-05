import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class AccountLockedException extends DomainException {
  // HttpStatus.LOCKED does not exist in @nestjs/common's HttpStatus
  // enum (it only covers a subset of the full IANA HTTP status
  // registry) — 423 Locked is used directly per RFC 4918.
  public readonly httpStatus = 423;

  constructor(unlocksAt: Date) {
    super(
      `Account is locked due to repeated failed login attempts until ${unlocksAt.toISOString()}`,
      'ACCOUNT_LOCKED',
    );
    this.name = 'AccountLockedException';
  }
}

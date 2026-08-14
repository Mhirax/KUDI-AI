import { User } from './user.entity';
import { Email } from '../value-objects/email.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { HashedPassword } from '../value-objects/password.vo';
import { AccountLockedException } from '../exceptions/account-locked.exception';
import { UserStatus } from '../enums/user-status.enum';

function buildUser(): User {
  return User.register({
    email: Email.create('customer@example.com'),
    phoneNumber: PhoneNumber.create('+2348012345678'),
    passwordHash: HashedPassword.fromHash('$2b$12$stubstubstubstubstubstubstubstubstubstubstub'),
    firstName: 'Ada',
    lastName: 'Lovelace',
  });
}

describe('User aggregate — login lockout invariant', () => {
  it('emits a UserRegisteredEvent on registration', () => {
    const user = buildUser();
    const events = user.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('identity.user.registered');
  });

  it('locks the account after 5 consecutive failed login attempts', () => {
    const user = buildUser();
    user.pullDomainEvents(); // discard registration event

    for (let i = 0; i < 4; i++) {
      user.recordFailedLogin(null);
    }
    expect(user.status).not.toBe(UserStatus.LOCKED);

    user.recordFailedLogin(null); // 5th attempt
    expect(user.status).toBe(UserStatus.LOCKED);
    expect(user.lockedUntil).not.toBeNull();
  });

  it('rejects further login attempts while locked', () => {
    const user = buildUser();
    for (let i = 0; i < 5; i++) {
      user.recordFailedLogin(null);
    }
    expect(() => user.assertCanAttemptLogin()).toThrow(AccountLockedException);
  });

  it('resets the failed-attempt counter after a successful login', () => {
    const user = buildUser();
    user.recordFailedLogin(null);
    user.recordFailedLogin(null);
    user.recordSuccessfulLogin(null, null);
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();
  });
});

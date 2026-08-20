import { User } from './user.entity';
import { Email } from '../value-objects/email.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { HashedPassword } from '../value-objects/password.vo';
import { UserStatus } from '../enums/user-status.enum';
import { AccountLockedException } from '../exceptions/account-locked.exception';

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

  it('locks the account after 5 consecutive failed attempts', () => {
    const user = buildUser();
    user.pullDomainEvents(); // discard registration event

    for (let i = 0; i < 5; i++) {
      user.recordFailedLogin(null);
    }
    expect(user.status).toBe(UserStatus.LOCKED);
    expect(user.failedLoginAttempts).toBe(5);
    expect(user.lockedUntil).not.toBeNull();
    expect(() => user.assertCanAttemptLogin()).toThrow(AccountLockedException);
  });

  it('does not lock the account before the 5th failed attempt', () => {
    const user = buildUser();
    for (let i = 0; i < 4; i++) {
      user.recordFailedLogin(null);
    }
    expect(user.status).not.toBe(UserStatus.LOCKED);
    expect(() => user.assertCanAttemptLogin()).not.toThrow();
  });

  it('resets the failed-attempt counter after a successful login', () => {
    const user = buildUser();
    user.recordFailedLogin(null);
    user.recordFailedLogin(null);
    user.recordSuccessfulLogin(null, null);
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();
  });

  it('auto-unlocks once the lockout window has passed, resetting the counter', () => {
    const user = buildUser();
    for (let i = 0; i < 5; i++) {
      user.recordFailedLogin(null);
    }
    expect(user.status).toBe(UserStatus.LOCKED);

    // Simulate the lockout window having already elapsed.
    const props = user.toProps();
    const expiredUser = User.reconstitute({ ...props, lockedUntil: new Date(Date.now() - 1000) });

    expect(() => expiredUser.assertCanAttemptLogin()).not.toThrow();
    expect(expiredUser.status).toBe(UserStatus.ACTIVE);
    expect(expiredUser.failedLoginAttempts).toBe(0);
    expect(expiredUser.lockedUntil).toBeNull();
  });
});

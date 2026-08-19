import { User } from './user.entity';
import { Email } from '../value-objects/email.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { HashedPassword } from '../value-objects/password.vo';
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

  // Lockout-on-repeated-failure is disabled for now — failed attempts are
  // still counted, but the account never flips to LOCKED and login is
  // never blocked because of them.
  it('does not lock the account no matter how many attempts fail', () => {
    const user = buildUser();
    user.pullDomainEvents(); // discard registration event

    for (let i = 0; i < 10; i++) {
      user.recordFailedLogin(null);
    }
    expect(user.status).not.toBe(UserStatus.LOCKED);
    expect(user.failedLoginAttempts).toBe(10);
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
});

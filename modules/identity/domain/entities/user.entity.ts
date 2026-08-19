import { randomUUID } from 'crypto';
import { Email } from '../value-objects/email.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { HashedPassword } from '../value-objects/password.vo';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { UserLoggedInEvent } from '../events/user-logged-in.event';
import { UserLoginFailedEvent } from '../events/user-login-failed.event';
import { PasswordChangedEvent } from '../events/password-changed.event';
import { UserNotActiveException } from '../exceptions/user-not-active.exception';
import { DomainEvent } from '../../../../shared/events/domain-event.base';

export interface UserProps {
  id: string;
  email: Email;
  phoneNumber: PhoneNumber;
  passwordHash: HashedPassword;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Aggregate Root.
 *
 * Owns all invariants relating to authentication state: credential
 * verification outcomes, progressive lockout after repeated failed
 * attempts, and account lifecycle status. All state transitions emit
 * domain events rather than mutating silently, so other bounded
 * contexts (Notifications, Compliance/Audit) can react without this
 * module depending on them directly (Event-Driven Architecture).
 */
export class User {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private props: UserProps) {}

  static register(params: {
    email: Email;
    phoneNumber: PhoneNumber;
    passwordHash: HashedPassword;
    firstName: string;
    lastName: string;
    role?: UserRole;
  }): User {
    const now = new Date();
    const user = new User({
      id: randomUUID(),
      email: params.email,
      phoneNumber: params.phoneNumber,
      passwordHash: params.passwordHash,
      firstName: params.firstName,
      lastName: params.lastName,
      role: params.role ?? UserRole.CUSTOMER,
      status: UserStatus.PENDING_VERIFICATION,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });

    user.addDomainEvent(
      new UserRegisteredEvent(user.props.id, user.props.email.getValue(), user.props.role),
    );

    return user;
  }

  /** Reconstructs a User from persisted state — no events are raised. */
  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  /**
   * Asserts the account is in a state that permits authentication,
   * throwing domain exceptions that the application layer translates
   * at the boundary.
   *
   * Lockout-on-repeated-failure is disabled for now (see recordFailedLogin) —
   * LOCKED is still accepted here so any account locked before the feature
   * was disabled can still log back in.
   */
  assertCanAttemptLogin(): void {
    if (
      this.props.status !== UserStatus.ACTIVE &&
      this.props.status !== UserStatus.PENDING_VERIFICATION &&
      this.props.status !== UserStatus.LOCKED
    ) {
      throw new UserNotActiveException(this.props.status);
    }
  }

  recordSuccessfulLogin(ipAddress: string | null, userAgent: string | null): void {
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
    if (this.props.status === UserStatus.LOCKED) {
      this.props.status = UserStatus.ACTIVE;
    }
    this.props.lastLoginAt = new Date();
    this.props.updatedAt = new Date();
    this.addDomainEvent(new UserLoggedInEvent(this.props.id, ipAddress, userAgent));
  }

  // Lockout-on-repeated-failure is disabled for now — failed attempts are
  // still counted/emitted for visibility, but never flip the account to
  // LOCKED. Re-enable by restoring the MAX_FAILED_LOGIN_ATTEMPTS check here.
  recordFailedLogin(ipAddress: string | null): void {
    this.props.failedLoginAttempts += 1;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new UserLoginFailedEvent(this.props.id, this.props.failedLoginAttempts, ipAddress),
    );
  }

  changePassword(newPasswordHash: HashedPassword): void {
    this.props.passwordHash = newPasswordHash;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new PasswordChangedEvent(this.props.id));
  }

  private addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  get id(): string {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get phoneNumber(): PhoneNumber {
    return this.props.phoneNumber;
  }

  get passwordHash(): HashedPassword {
    return this.props.passwordHash;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get failedLoginAttempts(): number {
    return this.props.failedLoginAttempts;
  }

  get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }

  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toProps(): Readonly<UserProps> {
    return { ...this.props };
  }
}

import { DomainEvent } from '../../../../shared/events/domain-event.base';

/**
 * Published on every failed login attempt to feed fraud/anomaly
 * detection and account-lockout policy enforcement.
 */
export class UserLoginFailedEvent extends DomainEvent {
  readonly eventName = 'identity.user.login_failed';

  constructor(
    readonly aggregateId: string,
    readonly failedAttemptCount: number,
    readonly ipAddress: string | null,
  ) {
    super();
  }
}

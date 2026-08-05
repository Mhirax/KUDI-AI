import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class UserLoggedInEvent extends DomainEvent {
  readonly eventName = 'identity.user.logged_in';

  constructor(
    readonly aggregateId: string,
    readonly ipAddress: string | null,
    readonly userAgent: string | null,
  ) {
    super();
  }
}

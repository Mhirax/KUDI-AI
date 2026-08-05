import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class UserLoggedOutEvent extends DomainEvent {
  readonly eventName = 'identity.user.logged_out';

  constructor(
    readonly aggregateId: string,
    readonly sessionId: string,
  ) {
    super();
  }
}

import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class UserRegisteredEvent extends DomainEvent {
  readonly eventName = 'identity.user.registered';

  constructor(
    readonly aggregateId: string,
    readonly email: string,
    readonly role: string,
  ) {
    super();
  }
}

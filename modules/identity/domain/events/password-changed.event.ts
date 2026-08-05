import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class PasswordChangedEvent extends DomainEvent {
  readonly eventName = 'identity.user.password_changed';

  constructor(readonly aggregateId: string) {
    super();
  }
}

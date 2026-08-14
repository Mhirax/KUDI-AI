import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class AccountActivatedEvent extends DomainEvent {
  readonly eventName = 'accounts.account.activated';

  constructor(readonly aggregateId: string) {
    super();
  }
}

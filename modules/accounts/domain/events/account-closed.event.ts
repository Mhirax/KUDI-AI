import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class AccountClosedEvent extends DomainEvent {
  readonly eventName = 'accounts.account.closed';

  constructor(readonly aggregateId: string) {
    super();
  }
}

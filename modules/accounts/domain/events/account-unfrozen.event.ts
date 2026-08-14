import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class AccountUnfrozenEvent extends DomainEvent {
  readonly eventName = 'accounts.account.unfrozen';

  constructor(readonly aggregateId: string) {
    super();
  }
}

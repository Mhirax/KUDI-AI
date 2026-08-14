import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class AccountFrozenEvent extends DomainEvent {
  readonly eventName = 'accounts.account.frozen';

  constructor(
    readonly aggregateId: string,
    readonly reason: string,
  ) {
    super();
  }
}

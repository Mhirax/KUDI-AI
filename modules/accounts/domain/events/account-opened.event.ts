import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class AccountOpenedEvent extends DomainEvent {
  readonly eventName = 'accounts.account.opened';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly accountNumber: string,
    readonly currency: string,
    readonly accountType: string,
  ) {
    super();
  }
}

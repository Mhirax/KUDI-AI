import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class AccountDebitedEvent extends DomainEvent {
  readonly eventName = 'accounts.account.debited';

  constructor(
    readonly aggregateId: string,
    readonly amountMinorUnits: string,
    readonly currency: string,
    readonly reference: string,
    readonly balanceAfterMinorUnits: string,
  ) {
    super();
  }
}

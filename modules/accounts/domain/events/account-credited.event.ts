import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class AccountCreditedEvent extends DomainEvent {
  readonly eventName = 'accounts.account.credited';

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

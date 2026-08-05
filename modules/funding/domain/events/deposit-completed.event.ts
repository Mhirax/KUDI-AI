import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class DepositCompletedEvent extends DomainEvent {
  readonly eventName = 'funding.deposit.completed';

  constructor(
    readonly aggregateId: string,
    readonly reference: string,
    readonly userId: string,
    readonly accountId: string,
    readonly amountMinorUnits: string,
    readonly currency: string,
  ) {
    super();
  }
}

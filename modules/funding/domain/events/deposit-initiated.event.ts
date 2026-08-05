import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class DepositInitiatedEvent extends DomainEvent {
  readonly eventName = 'funding.deposit.initiated';

  constructor(
    readonly aggregateId: string,
    readonly reference: string,
    readonly userId: string,
    readonly accountId: string,
    readonly channel: string,
    readonly amountMinorUnits: string,
    readonly currency: string,
  ) {
    super();
  }
}

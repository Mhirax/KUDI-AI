import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class DepositFailedEvent extends DomainEvent {
  readonly eventName = 'funding.deposit.failed';

  constructor(
    readonly aggregateId: string,
    readonly reference: string,
    readonly userId: string,
    readonly reason: string,
  ) {
    super();
  }
}

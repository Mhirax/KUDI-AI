import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class TransferCompletedEvent extends DomainEvent {
  readonly eventName = 'transfers.transfer.completed';

  constructor(
    readonly aggregateId: string,
    readonly reference: string,
  ) {
    super();
  }
}

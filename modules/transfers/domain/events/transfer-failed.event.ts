import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class TransferFailedEvent extends DomainEvent {
  readonly eventName = 'transfers.transfer.failed';

  constructor(
    readonly aggregateId: string,
    readonly reference: string,
    readonly reason: string,
  ) {
    super();
  }
}

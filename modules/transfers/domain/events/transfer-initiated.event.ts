import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class TransferInitiatedEvent extends DomainEvent {
  readonly eventName = 'transfers.transfer.initiated';

  constructor(
    readonly aggregateId: string,
    readonly reference: string,
    readonly type: string,
    readonly sourceAccountId: string,
    readonly amountMinorUnits: string,
    readonly currency: string,
  ) {
    super();
  }
}

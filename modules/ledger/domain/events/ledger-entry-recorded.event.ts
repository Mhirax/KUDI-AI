import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class LedgerEntryRecordedEvent extends DomainEvent {
  readonly eventName = 'ledger.entry.recorded';

  constructor(
    readonly aggregateId: string,
    readonly accountId: string,
    readonly direction: string,
    readonly amountMinorUnits: string,
    readonly currency: string,
    readonly reference: string,
  ) {
    super();
  }
}

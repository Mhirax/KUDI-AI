import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class BillPaymentCompletedEvent extends DomainEvent {
  readonly eventName = 'bills.payment.completed';

  constructor(
    readonly aggregateId: string,
    readonly reference: string,
    readonly userId: string,
    readonly category: string,
    readonly amountMinorUnits: string,
    readonly currency: string,
    /** Provider-issued value token (e.g. a prepaid electricity token), when applicable. */
    readonly valueToken: string | null,
  ) {
    super();
  }
}

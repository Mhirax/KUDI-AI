import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class BillPaymentReversedEvent extends DomainEvent {
  readonly eventName = 'bills.payment.reversed';

  constructor(
    readonly aggregateId: string,
    readonly reference: string,
    readonly userId: string,
    readonly reason: string,
  ) {
    super();
  }
}

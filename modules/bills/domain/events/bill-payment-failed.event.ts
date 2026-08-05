import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class BillPaymentFailedEvent extends DomainEvent {
  readonly eventName = 'bills.payment.failed';

  constructor(
    readonly aggregateId: string,
    readonly reference: string,
    readonly userId: string,
    readonly reason: string,
  ) {
    super();
  }
}

import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class BillPaymentInitiatedEvent extends DomainEvent {
  readonly eventName = 'bills.payment.initiated';

  constructor(
    readonly aggregateId: string,
    readonly reference: string,
    readonly userId: string,
    readonly accountId: string,
    readonly category: string,
    readonly billerCode: string,
    readonly customerIdentifier: string,
    readonly amountMinorUnits: string,
    readonly currency: string,
  ) {
    super();
  }
}

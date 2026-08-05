import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class LoanDisbursedEvent extends DomainEvent {
  readonly eventName = 'loans.loan.disbursed';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly accountId: string,
    readonly principalMinorUnits: string,
    readonly currency: string,
  ) {
    super();
  }
}

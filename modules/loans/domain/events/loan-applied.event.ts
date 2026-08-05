import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class LoanAppliedEvent extends DomainEvent {
  readonly eventName = 'loans.loan.applied';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly principalMinorUnits: string,
    readonly currency: string,
  ) {
    super();
  }
}

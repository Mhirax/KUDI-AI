import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class LoanRejectedEvent extends DomainEvent {
  readonly eventName = 'loans.loan.rejected';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly reason: string,
  ) {
    super();
  }
}

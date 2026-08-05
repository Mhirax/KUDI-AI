import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class LoanApprovedEvent extends DomainEvent {
  readonly eventName = 'loans.loan.approved';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly approvedByUserId: string,
  ) {
    super();
  }
}

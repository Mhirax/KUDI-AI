import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class LoanFullyRepaidEvent extends DomainEvent {
  readonly eventName = 'loans.loan.fully-repaid';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
  ) {
    super();
  }
}

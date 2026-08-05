import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class LoanRepaymentRecordedEvent extends DomainEvent {
  readonly eventName = 'loans.loan.repayment-recorded';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly amountMinorUnits: string,
    readonly currency: string,
    readonly remainingBalanceMinorUnits: string,
  ) {
    super();
  }
}

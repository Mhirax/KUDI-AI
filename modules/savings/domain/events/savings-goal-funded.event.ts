import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class SavingsGoalFundedEvent extends DomainEvent {
  readonly eventName = 'savings.goal.funded';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly amountMinorUnits: string,
    readonly currency: string,
  ) {
    super();
  }
}

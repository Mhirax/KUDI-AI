import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class SavingsGoalWithdrawnEvent extends DomainEvent {
  readonly eventName = 'savings.goal.withdrawn';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly amountMinorUnits: string,
    readonly currency: string,
  ) {
    super();
  }
}

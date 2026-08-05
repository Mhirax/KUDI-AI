import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class SavingsGoalClosedEvent extends DomainEvent {
  readonly eventName = 'savings.goal.closed';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
  ) {
    super();
  }
}

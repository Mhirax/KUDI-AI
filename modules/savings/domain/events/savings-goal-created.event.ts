import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class SavingsGoalCreatedEvent extends DomainEvent {
  readonly eventName = 'savings.goal.created';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly name: string,
  ) {
    super();
  }
}

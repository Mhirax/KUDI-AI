import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class RewardPointsEarnedEvent extends DomainEvent {
  readonly eventName = 'rewards.points.earned';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly points: number,
    readonly sourceReference: string | null,
  ) {
    super();
  }
}

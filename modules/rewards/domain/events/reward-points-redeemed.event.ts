import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class RewardPointsRedeemedEvent extends DomainEvent {
  readonly eventName = 'rewards.points.redeemed';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly points: number,
    readonly redemptionType: string,
  ) {
    super();
  }
}

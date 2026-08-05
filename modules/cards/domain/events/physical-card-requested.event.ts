import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class PhysicalCardRequestedEvent extends DomainEvent {
  readonly eventName = 'cards.card.physical-requested';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly accountId: string,
  ) {
    super();
  }
}

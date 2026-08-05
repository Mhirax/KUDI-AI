import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class CardFrozenEvent extends DomainEvent {
  readonly eventName = 'cards.card.frozen';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
  ) {
    super();
  }
}

import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class CardUnfrozenEvent extends DomainEvent {
  readonly eventName = 'cards.card.unfrozen';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
  ) {
    super();
  }
}

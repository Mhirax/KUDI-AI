import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class CardFundedEvent extends DomainEvent {
  readonly eventName = 'cards.card.funded';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    /** Minor units, as a string (bigint is not JSON-serializable). */
    readonly amountMinorUnits: string,
    readonly currency: string,
  ) {
    super();
  }
}

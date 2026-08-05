import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class CardTerminatedEvent extends DomainEvent {
  readonly eventName = 'cards.card.terminated';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly accountId: string,
    /** Minor units swept back to the source account, as a string. */
    readonly sweptAmountMinorUnits: string,
    readonly currency: string,
  ) {
    super();
  }
}

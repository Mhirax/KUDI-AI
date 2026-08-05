import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class UserAccountLockedEvent extends DomainEvent {
  readonly eventName = 'identity.user.account_locked';

  constructor(
    readonly aggregateId: string,
    readonly unlocksAt: Date,
  ) {
    super();
  }
}

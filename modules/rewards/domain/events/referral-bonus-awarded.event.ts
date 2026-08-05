import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class ReferralBonusAwardedEvent extends DomainEvent {
  readonly eventName = 'rewards.referral.bonus-awarded';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly points: number,
    readonly role: 'REFERRER' | 'REFEREE',
  ) {
    super();
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  KYC_PROFILE_REPOSITORY,
  IKycProfileRepository,
} from '../../domain/repositories/kyc-profile.repository.interface';
import { KycProfile } from '../../domain/entities/kyc-profile.entity';

// Cross-module dependency on Identity's published event — the mirror
// image of Accounts' dependency on this module's KycTierUpgradedEvent.
import { UserRegisteredEvent } from '../../../identity/domain/events/user-registered.event';

/**
 * Creates a default (TIER_1) `KycProfile` automatically whenever a new
 * user registers, so every user has exactly one profile from the
 * start — command handlers that submit BVN/NIN verification never
 * need to handle a "profile doesn't exist yet" branch as anything
 * other than an exceptional, should-never-happen case.
 */
@Injectable()
@EventsHandler(UserRegisteredEvent)
export class UserRegisteredHandler implements IEventHandler<UserRegisteredEvent> {
  private readonly logger = new Logger(UserRegisteredHandler.name);

  constructor(
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    const profile = KycProfile.createDefault(event.aggregateId);
    await this.kycProfileRepository.save(profile);
    profile.pullDomainEvents().forEach((domainEvent) => this.eventBus.publish(domainEvent));
    this.logger.log(`Created default KYC profile for newly-registered user ${event.aggregateId}`);
  }
}

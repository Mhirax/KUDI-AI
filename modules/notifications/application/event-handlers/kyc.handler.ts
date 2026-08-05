import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/repositories/notification.repository.interface';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationType } from '../../domain/enums/notification-type.enum';

// Cross-module dependency on Compliance's *published event* only.
import { KycTierUpgradedEvent } from '../../../compliance/domain/events/kyc-tier-upgraded.event';

/**
 * Projects KYC milestones into in-app notifications. Same
 * never-rethrow semantics as the other notification handlers.
 */
@Injectable()
@EventsHandler(KycTierUpgradedEvent)
export class KycNotificationHandler implements IEventHandler<KycTierUpgradedEvent> {
  private readonly logger = new Logger(KycNotificationHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async handle(event: KycTierUpgradedEvent): Promise<void> {
    try {
      await this.notificationRepository.save(
        Notification.create({
          userId: event.userId,
          type: NotificationType.KYC,
          title: 'Verification level upgraded',
          body: `Your identity verification has been upgraded to ${event.newTier.replace('_', ' ')}. Higher limits now apply to your account.`,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to record KYC notification for user ${event.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

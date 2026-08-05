import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/repositories/notification.repository.interface';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { APP_NAME } from '../../../../shared/constants';

// Cross-module dependencies on Identity's *published events* only —
// the standard event-driven boundary crossing used platform-wide.
import { UserRegisteredEvent } from '../../../identity/domain/events/user-registered.event';
import { PasswordChangedEvent } from '../../../identity/domain/events/password-changed.event';
import { UserAccountLockedEvent } from '../../../identity/domain/events/user-account-locked.event';

/**
 * Projects Identity's lifecycle/security events into in-app
 * notifications. Errors are logged, never rethrown — a failed
 * notification must not poison the event pipeline (the underlying
 * business operation already succeeded).
 */
@Injectable()
@EventsHandler(UserRegisteredEvent, PasswordChangedEvent, UserAccountLockedEvent)
export class IdentitySecurityNotificationHandler implements IEventHandler<
  UserRegisteredEvent | PasswordChangedEvent | UserAccountLockedEvent
> {
  private readonly logger = new Logger(IdentitySecurityNotificationHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async handle(
    event: UserRegisteredEvent | PasswordChangedEvent | UserAccountLockedEvent,
  ): Promise<void> {
    try {
      const notification = this.build(event);
      await this.notificationRepository.save(notification);
    } catch (error) {
      this.logger.error(
        `Failed to record notification for ${event.eventName} (${event.aggregateId})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private build(
    event: UserRegisteredEvent | PasswordChangedEvent | UserAccountLockedEvent,
  ): Notification {
    if (event instanceof UserRegisteredEvent) {
      return Notification.create({
        userId: event.aggregateId,
        type: NotificationType.ACCOUNT,
        title: `Welcome to ${APP_NAME}`,
        body: 'Your profile has been created. Complete BVN verification to activate your wallet and start banking.',
      });
    }

    if (event instanceof PasswordChangedEvent) {
      return Notification.create({
        userId: event.aggregateId,
        type: NotificationType.SECURITY,
        title: 'Your password was changed',
        body: 'Your password was changed just now. If this was not you, contact support immediately.',
      });
    }

    return Notification.create({
      userId: event.aggregateId,
      type: NotificationType.SECURITY,
      title: 'Your account has been locked',
      body: `Your account was locked after repeated failed sign-in attempts. It unlocks at ${event.unlocksAt.toISOString()}. If this was not you, contact support.`,
    });
  }
}

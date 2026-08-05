import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/repositories/notification.repository.interface';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationType } from '../../domain/enums/notification-type.enum';

// Cross-module dependencies on Accounts' *published events* and *port*
// (freeze/unfreeze events carry the accountId; the owner comes from a
// lookup through the exported repository port).
import { AccountFrozenEvent } from '../../../accounts/domain/events/account-frozen.event';
import { AccountUnfrozenEvent } from '../../../accounts/domain/events/account-unfrozen.event';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../accounts/domain/repositories/account.repository.interface';

/**
 * Projects account freeze/unfreeze into in-app notifications — a
 * frozen wallet without an explanation is a support ticket; with one,
 * it's a resolved question. Same never-rethrow semantics as the other
 * notification handlers.
 */
@Injectable()
@EventsHandler(AccountFrozenEvent, AccountUnfrozenEvent)
export class AccountStatusNotificationHandler implements IEventHandler<
  AccountFrozenEvent | AccountUnfrozenEvent
> {
  private readonly logger = new Logger(AccountStatusNotificationHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
  ) {}

  async handle(event: AccountFrozenEvent | AccountUnfrozenEvent): Promise<void> {
    try {
      const account = await this.accountRepository.findById(event.aggregateId);
      if (!account) {
        this.logger.error(`Account ${event.aggregateId} not found; skipping notification`);
        return;
      }

      const notification =
        event instanceof AccountFrozenEvent
          ? Notification.create({
              userId: account.userId,
              type: NotificationType.ACCOUNT,
              title: 'Your account has been frozen',
              body: `Your account ${account.accountNumber.getValue()} has been frozen (${event.reason}). Transactions are paused while it is under review — contact support for details.`,
            })
          : Notification.create({
              userId: account.userId,
              type: NotificationType.ACCOUNT,
              title: 'Your account is active again',
              body: `The freeze on your account ${account.accountNumber.getValue()} has been lifted. You can transact normally again.`,
            });

      await this.notificationRepository.save(notification);
    } catch (error) {
      this.logger.error(
        `Failed to record notification for ${event.eventName} (${event.aggregateId})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

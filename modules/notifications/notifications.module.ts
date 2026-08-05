import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Domain ports
import { NOTIFICATION_REPOSITORY } from './domain/repositories/notification.repository.interface';

// Infrastructure adapters
import { PrismaNotificationRepository } from './infrastructure/persistence/prisma-notification.repository';

// Application handlers
import { MarkNotificationReadHandler } from './application/commands/mark-notification-read/mark-notification-read.handler';
import { MarkAllNotificationsReadHandler } from './application/commands/mark-all-notifications-read/mark-all-notifications-read.handler';
import { ListMyNotificationsHandler } from './application/queries/list-my-notifications/list-my-notifications.handler';
import { GetUnreadCountHandler } from './application/queries/get-unread-count/get-unread-count.handler';
import { IdentitySecurityNotificationHandler } from './application/event-handlers/identity-security.handler';
import { KycNotificationHandler } from './application/event-handlers/kyc.handler';
import { MoneyMovementNotificationHandler } from './application/event-handlers/money-movement.handler';
import { AccountStatusNotificationHandler } from './application/event-handlers/account-status.handler';

// Presentation
import { NotificationsController } from './presentation/controllers/notifications.controller';

// Cross-module *module* imports: exported ports consumed by the event
// handlers (owner lookups and event enrichment).
import { AccountsModule } from '../accounts/accounts.module';
import { TransfersModule } from '../transfers/transfers.module';

const commandHandlers = [MarkNotificationReadHandler, MarkAllNotificationsReadHandler];
const queryHandlers = [ListMyNotificationsHandler, GetUnreadCountHandler];
const eventHandlers = [
  IdentitySecurityNotificationHandler,
  KycNotificationHandler,
  MoneyMovementNotificationHandler,
  AccountStatusNotificationHandler,
];

/**
 * Notifications bounded-context module — the customer's in-app
 * notification center.
 *
 * Sits at the end of the event pipeline: the write side is exclusively
 * the event handlers above, projecting domain events from Identity,
 * Compliance, Accounts, Funding, Bills and Transfers into persisted
 * notifications; the read side is self-service queries plus the two
 * mark-read commands. Additional delivery channels (email/SMS/push)
 * are a later phase and will subscribe to the same events — nothing
 * here changes when they arrive.
 */
@Module({
  imports: [CqrsModule, AccountsModule, TransfersModule],
  controllers: [NotificationsController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
  ],
  exports: [NOTIFICATION_REPOSITORY],
})
export class NotificationsModule {}

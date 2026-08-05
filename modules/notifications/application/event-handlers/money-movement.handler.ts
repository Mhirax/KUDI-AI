import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/repositories/notification.repository.interface';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

// Cross-module dependencies on *published events* (Funding, Bills) and
// one *published port* (Transfers' repository — TransferCompletedEvent
// carries only the reference, so amount/initiator come from a lookup).
import { DepositCompletedEvent } from '../../../funding/domain/events/deposit-completed.event';
import { DepositFailedEvent } from '../../../funding/domain/events/deposit-failed.event';
import { BillPaymentCompletedEvent } from '../../../bills/domain/events/bill-payment-completed.event';
import { BillPaymentReversedEvent } from '../../../bills/domain/events/bill-payment-reversed.event';
import { TransferCompletedEvent } from '../../../transfers/domain/events/transfer-completed.event';
import {
  ITransferRepository,
  TRANSFER_REPOSITORY,
} from '../../../transfers/domain/repositories/transfer.repository.interface';
import { TransferReference } from '../../../transfers/domain/value-objects/transfer-reference.vo';

type MoneyMovementEvent =
  | DepositCompletedEvent
  | DepositFailedEvent
  | BillPaymentCompletedEvent
  | BillPaymentReversedEvent
  | TransferCompletedEvent;

/**
 * Projects money-movement outcomes into in-app notifications — the
 * "credit/debit alert" backbone customers expect from a bank. Same
 * never-rethrow semantics as the other notification handlers.
 */
@Injectable()
@EventsHandler(
  DepositCompletedEvent,
  DepositFailedEvent,
  BillPaymentCompletedEvent,
  BillPaymentReversedEvent,
  TransferCompletedEvent,
)
export class MoneyMovementNotificationHandler implements IEventHandler<MoneyMovementEvent> {
  private readonly logger = new Logger(MoneyMovementNotificationHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: ITransferRepository,
  ) {}

  async handle(event: MoneyMovementEvent): Promise<void> {
    try {
      const notification = await this.build(event);
      if (notification) {
        await this.notificationRepository.save(notification);
      }
    } catch (error) {
      this.logger.error(
        `Failed to record notification for ${event.eventName} (${event.aggregateId})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async build(event: MoneyMovementEvent): Promise<Notification | null> {
    if (event instanceof DepositCompletedEvent) {
      const amount = this.format(event.amountMinorUnits, event.currency);
      return Notification.create({
        userId: event.userId,
        type: NotificationType.TRANSACTION,
        title: 'Credit alert',
        body: `Your wallet has been credited with ${amount}. Reference: ${event.reference}.`,
        reference: event.reference,
      });
    }

    if (event instanceof DepositFailedEvent) {
      return Notification.create({
        userId: event.userId,
        type: NotificationType.TRANSACTION,
        title: 'Deposit could not be completed',
        body: `A deposit (reference ${event.reference}) could not be completed: ${event.reason}. Contact support if you were debited.`,
        reference: event.reference,
      });
    }

    if (event instanceof BillPaymentCompletedEvent) {
      const amount = this.format(event.amountMinorUnits, event.currency);
      const tokenLine = event.valueToken ? ` Your token: ${event.valueToken}.` : '';
      return Notification.create({
        userId: event.userId,
        type: NotificationType.TRANSACTION,
        title: 'Bill payment successful',
        body: `Your ${event.category.replace('_', ' ').toLowerCase()} payment of ${amount} was successful.${tokenLine} Reference: ${event.reference}.`,
        reference: event.reference,
      });
    }

    if (event instanceof BillPaymentReversedEvent) {
      return Notification.create({
        userId: event.userId,
        type: NotificationType.TRANSACTION,
        title: 'Bill payment reversed',
        body: `Your bill payment (reference ${event.reference}) could not be completed and your money has been returned to your wallet. Reason: ${event.reason}.`,
        reference: event.reference,
      });
    }

    // TransferCompletedEvent — enrich via the Transfers port.
    const transfer = await this.transferRepository.findByReference(
      TransferReference.create(event.reference),
    );
    if (!transfer) {
      this.logger.error(`Completed transfer ${event.reference} not found; skipping notification`);
      return null;
    }
    const amount = transfer.amount.toMajorUnitsString();
    return Notification.create({
      userId: transfer.initiatorUserId,
      type: NotificationType.TRANSACTION,
      title: 'Transfer successful',
      body: `Your transfer of ${transfer.amount.getCurrency()} ${amount} was successful. Reference: ${event.reference}.`,
      reference: event.reference,
    });
  }

  private format(minorUnits: string, currency: string): string {
    const money = Money.fromMinorUnits(minorUnits, currency as Currency);
    return `${currency} ${money.toMajorUnitsString()}`;
  }
}

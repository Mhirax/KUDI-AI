import { MoneyMovementNotificationHandler } from './money-movement.handler';
import { INotificationRepository } from '../../domain/repositories/notification.repository.interface';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { Notification } from '../../domain/entities/notification.entity';
import { DepositCompletedEvent } from '../../../funding/domain/events/deposit-completed.event';
import { BillPaymentCompletedEvent } from '../../../bills/domain/events/bill-payment-completed.event';
import { TransferCompletedEvent } from '../../../transfers/domain/events/transfer-completed.event';
import { ITransferRepository } from '../../../transfers/domain/repositories/transfer.repository.interface';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

describe('MoneyMovementNotificationHandler', () => {
  let notificationRepository: jest.Mocked<INotificationRepository>;
  let transferRepository: jest.Mocked<Pick<ITransferRepository, 'findByReference'>>;
  let handler: MoneyMovementNotificationHandler;

  beforeEach(() => {
    notificationRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findPageByUserId: jest.fn(),
      countUnread: jest.fn(),
      markAllRead: jest.fn(),
    };
    transferRepository = { findByReference: jest.fn() };
    handler = new MoneyMovementNotificationHandler(
      notificationRepository,
      transferRepository as unknown as ITransferRepository,
    );
  });

  function savedNotification(): Notification {
    return notificationRepository.save.mock.calls[0][0];
  }

  it('records a credit alert with the formatted amount for a completed deposit', async () => {
    await handler.handle(
      new DepositCompletedEvent(
        'dep-1',
        'KUDI-DEP-0123456789AB',
        'user-1',
        'account-1',
        '150000',
        'NGN',
      ),
    );

    const notification = savedNotification();
    expect(notification.userId).toBe('user-1');
    expect(notification.type).toBe(NotificationType.TRANSACTION);
    expect(notification.body).toContain('NGN 1500.00');
    expect(notification.reference).toBe('KUDI-DEP-0123456789AB');
  });

  it('includes the value token for a completed bill payment', async () => {
    await handler.handle(
      new BillPaymentCompletedEvent(
        'bill-1',
        'KUDI-BILL-0123456789AB',
        'user-1',
        'ELECTRICITY',
        '500000',
        'NGN',
        '1234-5678',
      ),
    );

    expect(savedNotification().body).toContain('Your token: 1234-5678');
  });

  it('enriches transfer notifications via the Transfers port', async () => {
    transferRepository.findByReference.mockResolvedValue({
      initiatorUserId: 'user-9',
      amount: Money.fromDecimalString('250.00', Currency.NGN),
    } as never);

    await handler.handle(new TransferCompletedEvent('tr-1', 'KUDI-0123456789ABCDEF'));

    const notification = savedNotification();
    expect(notification.userId).toBe('user-9');
    expect(notification.body).toContain('NGN 250.00');
  });

  it('never rethrows when persistence fails', async () => {
    notificationRepository.save.mockRejectedValue(new Error('db down'));

    await expect(
      handler.handle(
        new DepositCompletedEvent(
          'dep-1',
          'KUDI-DEP-0123456789AB',
          'user-1',
          'account-1',
          '100',
          'NGN',
        ),
      ),
    ).resolves.toBeUndefined();
  });
});

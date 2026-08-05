import { Notification } from './notification.entity';
import { NotificationType } from '../enums/notification-type.enum';

function createNotification(): Notification {
  return Notification.create({
    userId: 'user-1',
    type: NotificationType.TRANSACTION,
    title: 'Credit alert',
    body: 'Your wallet has been credited with NGN 500.00.',
    reference: 'KUDI-DEP-0123456789AB',
  });
}

describe('Notification aggregate', () => {
  it('creates unread with content and reference', () => {
    const notification = createNotification();

    expect(notification.isRead).toBe(false);
    expect(notification.readAt).toBeNull();
    expect(notification.reference).toBe('KUDI-DEP-0123456789AB');
    expect(notification.type).toBe(NotificationType.TRANSACTION);
  });

  it('marks read exactly once and records when', () => {
    const notification = createNotification();

    notification.markRead();
    const firstReadAt = notification.readAt;

    expect(notification.isRead).toBe(true);
    expect(firstReadAt).toBeInstanceOf(Date);

    notification.markRead(); // idempotent
    expect(notification.readAt).toBe(firstReadAt);
  });

  it('defaults reference to null when the event has none', () => {
    const notification = Notification.create({
      userId: 'user-1',
      type: NotificationType.SECURITY,
      title: 'Password changed',
      body: 'Your password was changed just now.',
    });
    expect(notification.reference).toBeNull();
  });
});

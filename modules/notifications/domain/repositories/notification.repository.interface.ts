import { Notification } from '../entities/notification.entity';

export interface NotificationPage {
  notifications: Notification[];
  total: number;
}

/**
 * Port for Notification persistence. Content rows are write-once; the
 * only update path is the read flag, so no optimistic concurrency is
 * needed (marking read twice converges to the same state).
 */
export interface INotificationRepository {
  save(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | null>;
  findPageByUserId(params: {
    userId: string;
    page: number;
    limit: number;
    unreadOnly?: boolean;
  }): Promise<NotificationPage>;
  countUnread(userId: string): Promise<number>;
  markAllRead(userId: string): Promise<number>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

import { Notification as PrismaNotification } from '@prisma/client';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationType } from '../../domain/enums/notification-type.enum';

export class NotificationMapper {
  static toDomain(record: PrismaNotification): Notification {
    return Notification.reconstitute({
      id: record.id,
      userId: record.userId,
      type: record.type as NotificationType,
      title: record.title,
      body: record.body,
      reference: record.reference,
      isRead: record.isRead,
      readAt: record.readAt,
      createdAt: record.createdAt,
    });
  }

  static toPersistence(notification: Notification): PrismaNotification {
    const props = notification.toProps();
    return {
      id: props.id,
      userId: props.userId,
      type: props.type,
      title: props.title,
      body: props.body,
      reference: props.reference,
      isRead: props.isRead,
      readAt: props.readAt,
      createdAt: props.createdAt,
    };
  }
}

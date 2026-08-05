import { Notification } from '../../domain/entities/notification.entity';

export class NotificationResponseDto {
  id: string;
  type: string;
  title: string;
  body: string;
  reference: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;

  static fromDomain(notification: Notification): NotificationResponseDto {
    const props = notification.toProps();
    return {
      id: props.id,
      type: props.type,
      title: props.title,
      body: props.body,
      reference: props.reference,
      isRead: props.isRead,
      readAt: props.readAt ? props.readAt.toISOString() : null,
      createdAt: props.createdAt.toISOString(),
    };
  }
}

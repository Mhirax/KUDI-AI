import { randomUUID } from 'crypto';
import { NotificationType } from '../enums/notification-type.enum';

export interface NotificationProps {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Business reference of the subject (transfer/deposit/bill reference), when one exists. */
  reference: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * Notification Aggregate Root — one item in a customer's in-app
 * notification center.
 *
 * This module sits at the *end* of the event pipeline: notifications
 * are projections of other modules' domain events, so the aggregate
 * publishes no events of its own (a notification about a notification
 * would be noise). Its only mutation is `markRead()` — content is
 * immutable once written.
 *
 * Delivery channels beyond in-app (email, SMS, push) are a later
 * phase: they will subscribe to the same domain events through their
 * own channel port, not extend this aggregate.
 */
export class Notification {
  private constructor(private props: NotificationProps) {}

  static create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    reference?: string;
  }): Notification {
    return new Notification({
      id: randomUUID(),
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      reference: params.reference ?? null,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: NotificationProps): Notification {
    return new Notification(props);
  }

  markRead(): void {
    if (this.props.isRead) {
      return; // Idempotent — re-reading is not an error.
    }
    this.props.isRead = true;
    this.props.readAt = new Date();
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get type(): NotificationType {
    return this.props.type;
  }
  get title(): string {
    return this.props.title;
  }
  get body(): string {
    return this.props.body;
  }
  get reference(): string | null {
    return this.props.reference;
  }
  get isRead(): boolean {
    return this.props.isRead;
  }
  get readAt(): Date | null {
    return this.props.readAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<NotificationProps> {
    return { ...this.props };
  }
}

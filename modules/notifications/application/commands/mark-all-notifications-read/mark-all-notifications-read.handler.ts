import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarkAllNotificationsReadCommand } from './mark-all-notifications-read.command';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../../domain/repositories/notification.repository.interface';

@Injectable()
@CommandHandler(MarkAllNotificationsReadCommand)
export class MarkAllNotificationsReadHandler implements ICommandHandler<
  MarkAllNotificationsReadCommand,
  { markedRead: number }
> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(command: MarkAllNotificationsReadCommand): Promise<{ markedRead: number }> {
    const markedRead = await this.notificationRepository.markAllRead(command.userId);
    return { markedRead };
  }
}

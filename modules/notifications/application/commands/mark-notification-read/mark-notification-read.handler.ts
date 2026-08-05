import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarkNotificationReadCommand } from './mark-notification-read.command';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../../domain/repositories/notification.repository.interface';
import { NotificationNotFoundException } from '../../../domain/exceptions/notification-not-found.exception';
import { NotificationResponseDto } from '../../dto/notification-response.dto';

/**
 * Strictly owner-only — deliberately no admin override: reading
 * another person's notification state has no legitimate operational
 * use.
 */
@Injectable()
@CommandHandler(MarkNotificationReadCommand)
export class MarkNotificationReadHandler implements ICommandHandler<
  MarkNotificationReadCommand,
  NotificationResponseDto
> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(command: MarkNotificationReadCommand): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findById(command.notificationId);
    if (!notification) {
      throw new NotificationNotFoundException(command.notificationId);
    }
    if (notification.userId !== command.requestingUserId) {
      throw new ForbiddenException('You may only manage your own notifications');
    }

    notification.markRead();
    await this.notificationRepository.save(notification);
    return NotificationResponseDto.fromDomain(notification);
  }
}

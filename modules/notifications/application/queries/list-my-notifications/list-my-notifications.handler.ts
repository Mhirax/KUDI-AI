import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListMyNotificationsQuery } from './list-my-notifications.query';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../../domain/repositories/notification.repository.interface';
import { NotificationResponseDto } from '../../dto/notification-response.dto';
import { PaginatedResponseDto } from '../../../../../shared/dto/paginated-response.dto';

@Injectable()
@QueryHandler(ListMyNotificationsQuery)
export class ListMyNotificationsHandler implements IQueryHandler<
  ListMyNotificationsQuery,
  PaginatedResponseDto<NotificationResponseDto>
> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(
    query: ListMyNotificationsQuery,
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    const { notifications, total } = await this.notificationRepository.findPageByUserId({
      userId: query.userId,
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unreadOnly,
    });
    return {
      data: notifications.map((notification) => NotificationResponseDto.fromDomain(notification)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}

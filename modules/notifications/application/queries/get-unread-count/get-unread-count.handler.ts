import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUnreadCountQuery } from './get-unread-count.query';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../../domain/repositories/notification.repository.interface';

@Injectable()
@QueryHandler(GetUnreadCountQuery)
export class GetUnreadCountHandler implements IQueryHandler<
  GetUnreadCountQuery,
  { unread: number }
> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(query: GetUnreadCountQuery): Promise<{ unread: number }> {
    const unread = await this.notificationRepository.countUnread(query.userId);
    return { unread };
  }
}

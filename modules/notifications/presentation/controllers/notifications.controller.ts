import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../../../../shared/dto/paginated-response.dto';
import { ListNotificationsDto } from '../../application/dto/list-notifications.dto';
import { NotificationResponseDto } from '../../application/dto/notification-response.dto';
import { ListMyNotificationsQuery } from '../../application/queries/list-my-notifications/list-my-notifications.query';
import { GetUnreadCountQuery } from '../../application/queries/get-unread-count/get-unread-count.query';
import { MarkNotificationReadCommand } from '../../application/commands/mark-notification-read/mark-notification-read.command';
import { MarkAllNotificationsReadCommand } from '../../application/commands/mark-all-notifications-read/mark-all-notifications-read.command';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';

/**
 * Strictly self-service: every route operates on the caller's own
 * notifications only. There are no admin views here by design — see
 * MarkNotificationReadHandler's header.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('me')
  async listMine(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListNotificationsDto,
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    return this.queryBus.execute(
      new ListMyNotificationsQuery(user.sub, query.page, query.limit, query.unreadOnly ?? false),
    );
  }

  @Get('me/unread-count')
  async unreadCount(@CurrentUser() user: AccessTokenPayload): Promise<{ unread: number }> {
    return this.queryBus.execute(new GetUnreadCountQuery(user.sub));
  }

  @Post(':notificationId/read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @CurrentUser() user: AccessTokenPayload,
    @Param('notificationId') notificationId: string,
  ): Promise<NotificationResponseDto> {
    return this.commandBus.execute(new MarkNotificationReadCommand(notificationId, user.sub));
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: AccessTokenPayload): Promise<{ markedRead: number }> {
    return this.commandBus.execute(new MarkAllNotificationsReadCommand(user.sub));
  }
}

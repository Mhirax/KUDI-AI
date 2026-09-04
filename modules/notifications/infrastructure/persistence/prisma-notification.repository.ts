import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  INotificationRepository,
  NotificationPage,
} from '../../domain/repositories/notification.repository.interface';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationMapper } from '../mappers/notification.mapper';

/**
 * Concrete adapter for `INotificationRepository`. `save()` upserts:
 * creation and the mark-read mutation share one code path, and
 * re-saving an unchanged row is harmless by design (see the port's
 * header on why no optimistic concurrency is needed here).
 */
@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(notification: Notification): Promise<void> {
    const data = NotificationMapper.toPersistence(notification);
    await this.prisma.notification.upsert({
      where: { id: data.id },
      create: data,
      update: { isRead: data.isRead, readAt: data.readAt },
    });
  }

  async findById(id: string): Promise<Notification | null> {
    const record = await this.prisma.notification.findUnique({ where: { id } });
    return record ? NotificationMapper.toDomain(record) : null;
  }

  async findPageByUserId(params: {
    userId: string;
    page: number;
    limit: number;
    unreadOnly?: boolean;
  }): Promise<NotificationPage> {
    const where = {
      userId: params.userId,
      ...(params.unreadOnly ? { isRead: false } : {}),
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return {
      notifications: records.map((record: any) => NotificationMapper.toDomain(record)),
      total,
    };
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }
}

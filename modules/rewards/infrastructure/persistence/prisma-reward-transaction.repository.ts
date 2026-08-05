import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IRewardTransactionRepository,
  RewardTransactionPage,
} from '../../domain/repositories/reward-transaction.repository.interface';
import { RewardTransaction } from '../../domain/entities/reward-transaction.entity';
import { RewardTransactionMapper } from '../mappers/reward-transaction.mapper';

@Injectable()
export class PrismaRewardTransactionRepository implements IRewardTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsBySourceEventId(sourceEventId: string): Promise<boolean> {
    const record = await this.prisma.rewardTransaction.findUnique({ where: { sourceEventId } });
    return record !== null;
  }

  async findPageByUserId(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<RewardTransactionPage> {
    const where = { userId: params.userId };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.rewardTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.rewardTransaction.count({ where }),
    ]);
    return {
      transactions: records.map((record: any) => RewardTransactionMapper.toDomain(record)),
      total,
    };
  }

  async save(transaction: RewardTransaction): Promise<void> {
    await this.prisma.rewardTransaction.create({
      data: RewardTransactionMapper.toPersistence(transaction),
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ISavingsGoalRepository } from '../../domain/repositories/savings-goal.repository.interface';
import { SavingsGoal } from '../../domain/entities/savings-goal.entity';
import { SavingsGoalMapper } from '../mappers/savings-goal.mapper';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Concrete adapter for `ISavingsGoalRepository`, with the platform's
 * standard optimistic-concurrency `save()` (see PrismaAccountRepository
 * / PrismaBillPaymentRepository).
 */
@Injectable()
export class PrismaSavingsGoalRepository implements ISavingsGoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SavingsGoal | null> {
    const record = await this.prisma.savingsGoal.findUnique({ where: { id } });
    return record ? SavingsGoalMapper.toDomain(record) : null;
  }

  async findBySavingsAccountId(savingsAccountId: string): Promise<SavingsGoal | null> {
    const record = await this.prisma.savingsGoal.findUnique({ where: { savingsAccountId } });
    return record ? SavingsGoalMapper.toDomain(record) : null;
  }

  async findAllByUserId(userId: string): Promise<SavingsGoal[]> {
    const records = await this.prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record: any) => SavingsGoalMapper.toDomain(record));
  }

  async save(goal: SavingsGoal): Promise<void> {
    const data = SavingsGoalMapper.toPersistence(goal);
    const previousVersion = data.version - 1;

    if (previousVersion < 0) {
      await this.prisma.savingsGoal.create({ data });
      return;
    }

    const result = await this.prisma.savingsGoal.updateMany({
      where: { id: data.id, version: previousVersion },
      data,
    });

    if (result.count === 0) {
      throw new DomainException(
        `Savings goal ${data.id} was modified concurrently; please retry`,
        'CONCURRENT_MODIFICATION',
      );
    }
  }
}

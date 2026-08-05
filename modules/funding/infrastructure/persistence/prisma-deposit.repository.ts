import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IDepositRepository,
  DepositPage,
} from '../../domain/repositories/deposit.repository.interface';
import { Deposit } from '../../domain/entities/deposit.entity';
import { DepositReference } from '../../domain/value-objects/deposit-reference.vo';
import { DepositMapper } from '../mappers/deposit.mapper';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Concrete adapter for `IDepositRepository`, backed by
 * Prisma/PostgreSQL. `save()` implements the same
 * optimistic-concurrency scheme as PrismaAccountRepository: updates
 * are conditioned on the version the aggregate was loaded with, so two
 * concurrent settlement attempts can never both succeed.
 */
@Injectable()
export class PrismaDepositRepository implements IDepositRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Deposit | null> {
    const record = await this.prisma.deposit.findUnique({ where: { id } });
    return record ? DepositMapper.toDomain(record) : null;
  }

  async findByReference(reference: DepositReference): Promise<Deposit | null> {
    const record = await this.prisma.deposit.findUnique({
      where: { reference: reference.getValue() },
    });
    return record ? DepositMapper.toDomain(record) : null;
  }

  async findByProviderTransactionId(providerTransactionId: string): Promise<Deposit | null> {
    const record = await this.prisma.deposit.findUnique({
      where: { providerTransactionId },
    });
    return record ? DepositMapper.toDomain(record) : null;
  }

  async findPageByUserId(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<DepositPage> {
    const where = { userId: params.userId };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.deposit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.deposit.count({ where }),
    ]);
    return { deposits: records.map((record: any) => DepositMapper.toDomain(record)), total };
  }

  async save(deposit: Deposit): Promise<void> {
    const data = DepositMapper.toPersistence(deposit);
    const previousVersion = data.version - 1;

    if (previousVersion < 0) {
      await this.prisma.deposit.create({ data });
      return;
    }

    const result = await this.prisma.deposit.updateMany({
      where: { id: data.id, version: previousVersion },
      data,
    });

    if (result.count === 0) {
      throw new DomainException(
        `Deposit ${data.id} was modified concurrently; please retry`,
        'CONCURRENT_MODIFICATION',
      );
    }
  }
}

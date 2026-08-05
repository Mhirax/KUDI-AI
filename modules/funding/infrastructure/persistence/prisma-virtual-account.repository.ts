import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IVirtualAccountRepository } from '../../domain/repositories/virtual-account.repository.interface';
import { VirtualAccount } from '../../domain/entities/virtual-account.entity';
import { VirtualAccountMapper } from '../mappers/virtual-account.mapper';

/**
 * Concrete adapter for `IVirtualAccountRepository`. Create-only, per
 * the port: virtual accounts are routing metadata written once. The
 * unique constraint on `accountId` enforces one virtual account per
 * wallet at the database level.
 */
@Injectable()
export class PrismaVirtualAccountRepository implements IVirtualAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAccountId(accountId: string): Promise<VirtualAccount | null> {
    const record = await this.prisma.virtualAccount.findUnique({ where: { accountId } });
    return record ? VirtualAccountMapper.toDomain(record) : null;
  }

  async findByProviderReference(providerReference: string): Promise<VirtualAccount | null> {
    const record = await this.prisma.virtualAccount.findUnique({ where: { providerReference } });
    return record ? VirtualAccountMapper.toDomain(record) : null;
  }

  async findAllByUserId(userId: string): Promise<VirtualAccount[]> {
    const records = await this.prisma.virtualAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record: any) => VirtualAccountMapper.toDomain(record));
  }

  async save(virtualAccount: VirtualAccount): Promise<void> {
    await this.prisma.virtualAccount.create({
      data: VirtualAccountMapper.toPersistence(virtualAccount),
    });
  }
}

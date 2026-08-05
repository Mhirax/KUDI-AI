import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IAccountRepository } from '../../domain/repositories/account.repository.interface';
import { Account } from '../../domain/entities/account.entity';
import { AccountNumber } from '../../domain/value-objects/account-number.vo';
import { AccountMapper } from '../mappers/account.mapper';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Concrete adapter for `IAccountRepository`, backed by Prisma/PostgreSQL.
 *
 * `save()` implements optimistic concurrency control: updates are
 * conditioned on the `version` the in-memory aggregate was loaded
 * with. If zero rows match (because another process already advanced
 * the version), the write is rejected rather than silently
 * overwriting a concurrent credit/debit — a lost-update bug on account
 * balances is a data-integrity incident, not a cosmetic issue.
 */
@Injectable()
export class PrismaAccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Account | null> {
    const record = await this.prisma.account.findUnique({ where: { id } });
    return record ? AccountMapper.toDomain(record) : null;
  }

  async findByAccountNumber(accountNumber: AccountNumber): Promise<Account | null> {
    const record = await this.prisma.account.findUnique({
      where: { accountNumber: accountNumber.getValue() },
    });
    return record ? AccountMapper.toDomain(record) : null;
  }

  async findAllByUserId(userId: string): Promise<Account[]> {
    const records = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record: any) => AccountMapper.toDomain(record));
  }

  async existsByAccountNumber(accountNumber: AccountNumber): Promise<boolean> {
    const count = await this.prisma.account.count({
      where: { accountNumber: accountNumber.getValue() },
    });
    return count > 0;
  }

  async save(account: Account): Promise<void> {
    const data = AccountMapper.toPersistence(account);
    const previousVersion = data.version - 1;

    if (previousVersion < 0) {
      // Brand-new aggregate — no prior row can exist to race against.
      await this.prisma.account.create({ data });
      return;
    }

    const result = await this.prisma.account.updateMany({
      where: { id: data.id, version: previousVersion },
      data,
    });

    if (result.count === 0) {
      throw new DomainException(
        `Account ${data.id} was modified concurrently; please retry`,
        'CONCURRENT_MODIFICATION',
      );
    }
  }
}

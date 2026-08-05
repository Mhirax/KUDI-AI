import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ILedgerEntryRepository,
  LedgerPage,
  StatementTotals,
} from '../../domain/repositories/ledger-entry.repository.interface';
import { LedgerEntry } from '../../domain/entities/ledger-entry.entity';
import { LedgerEntryMapper } from '../mappers/ledger-entry.mapper';
import { EntryDirection } from '../../domain/enums/entry-direction.enum';

/**
 * Concrete adapter for `ILedgerEntryRepository`, backed by
 * Prisma/PostgreSQL. Append-only: this class exposes no update or
 * delete path, mirroring the port.
 *
 * Idempotency: `append()` relies on the unique constraint on
 * `sourceEventId`. A `P2002` unique-violation from Prisma means the
 * event was already projected (at-least-once delivery re-fired it) —
 * reported as `false`, never thrown, so event handlers can skip
 * quietly instead of poisoning the event pipeline.
 */
@Injectable()
export class PrismaLedgerEntryRepository implements ILedgerEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async append(entry: LedgerEntry): Promise<boolean> {
    try {
      await this.prisma.ledgerEntry.create({ data: LedgerEntryMapper.toPersistence(entry) });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return false;
      }
      throw error;
    }
  }

  async findById(id: string): Promise<LedgerEntry | null> {
    const record = await this.prisma.ledgerEntry.findUnique({ where: { id } });
    return record ? LedgerEntryMapper.toDomain(record) : null;
  }

  async findPageByAccountId(params: {
    accountId: string;
    page: number;
    limit: number;
    from?: Date;
    to?: Date;
  }): Promise<LedgerPage> {
    const where: Prisma.LedgerEntryWhereInput = {
      accountId: params.accountId,
      ...(params.from || params.to
        ? {
            occurredAt: {
              ...(params.from && { gte: params.from }),
              ...(params.to && { lte: params.to }),
            },
          }
        : {}),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    return { entries: records.map((record: any) => LedgerEntryMapper.toDomain(record)), total };
  }

  async findLastEntryBefore(accountId: string, before: Date): Promise<LedgerEntry | null> {
    const record = await this.prisma.ledgerEntry.findFirst({
      where: { accountId, occurredAt: { lt: before } },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return record ? LedgerEntryMapper.toDomain(record) : null;
  }

  async findLastEntryAtOrBefore(accountId: string, atOrBefore: Date): Promise<LedgerEntry | null> {
    const record = await this.prisma.ledgerEntry.findFirst({
      where: { accountId, occurredAt: { lte: atOrBefore } },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return record ? LedgerEntryMapper.toDomain(record) : null;
  }

  async sumForPeriod(accountId: string, from: Date, to: Date): Promise<StatementTotals> {
    const period = { accountId, occurredAt: { gte: from, lte: to } };

    const [credits, debits, entryCount] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.aggregate({
        where: { ...period, direction: EntryDirection.CREDIT },
        _sum: { amountMinorUnits: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { ...period, direction: EntryDirection.DEBIT },
        _sum: { amountMinorUnits: true },
      }),
      this.prisma.ledgerEntry.count({ where: period }),
    ]);

    return {
      totalCreditsMinorUnits: credits._sum.amountMinorUnits ?? 0n,
      totalDebitsMinorUnits: debits._sum.amountMinorUnits ?? 0n,
      entryCount,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ITransferRepository } from '../../domain/repositories/transfer.repository.interface';
import { Transfer } from '../../domain/entities/transfer.entity';
import { TransferReference } from '../../domain/value-objects/transfer-reference.vo';
import { TransferMapper } from '../mappers/transfer.mapper';
import { DomainException } from '../../../../shared/exceptions/domain.exception';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';
import { TransactionStatus } from '../../../../shared/enums/transaction-status.enum';

@Injectable()
export class PrismaTransferRepository implements ITransferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Transfer | null> {
    const record = await this.prisma.transfer.findUnique({ where: { id } });
    return record ? TransferMapper.toDomain(record) : null;
  }

  async findByReference(reference: TransferReference): Promise<Transfer | null> {
    const record = await this.prisma.transfer.findUnique({
      where: { reference: reference.getValue() },
    });
    return record ? TransferMapper.toDomain(record) : null;
  }

  async findByProviderReference(providerReference: string): Promise<Transfer | null> {
    const record = await this.prisma.transfer.findFirst({ where: { providerReference } });
    return record ? TransferMapper.toDomain(record) : null;
  }

  async findAllByUserId(userId: string): Promise<Transfer[]> {
    const records = await this.prisma.transfer.findMany({
      where: { initiatorUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => TransferMapper.toDomain(record));
  }

  async save(transfer: Transfer): Promise<void> {
    const data = TransferMapper.toPersistence(transfer);
    const previousVersion = data.version - 1;

    if (previousVersion < 0) {
      await this.prisma.transfer.create({ data });
      return;
    }

    const result = await this.prisma.transfer.updateMany({
      where: { id: data.id, version: previousVersion },
      data,
    });

    if (result.count === 0) {
      // A zero-match update is ambiguous by itself: it's the expected
      // signal for a genuine concurrent modification, but it's also
      // what happens when a mutator (e.g. markFailed()) runs on a
      // transfer that was never persisted in the first place — its
      // in-memory version is no longer 0 even though no row exists yet
      // (PrismaInternalTransferExecutor's failure path does exactly
      // this: markFailed() before the very first save, since the
      // success path persists via a raw tx.transfer.create() instead
      // of this method). Only throw once we've confirmed the row
      // actually exists; otherwise this is really a first-time create.
      const exists = await this.prisma.transfer.findUnique({
        where: { id: data.id },
        select: { id: true },
      });

      if (!exists) {
        await this.prisma.transfer.create({ data });
        return;
      }

      throw new DomainException(
        `Transfer ${data.id} was modified concurrently; please retry`,
        'CONCURRENT_MODIFICATION',
      );
    }
  }

  async sumSourceAmountSince(sourceAccountId: string, since: Date, currency: Currency): Promise<Money> {
    const result = await this.prisma.transfer.aggregate({
      where: {
        sourceAccountId,
        status: { in: [TransactionStatus.SUCCESSFUL, TransactionStatus.PROCESSING] },
        createdAt: { gte: since },
      },
      _sum: { amountMinorUnits: true },
    });
    return Money.fromMinorUnits(result._sum.amountMinorUnits ?? 0n, currency);
  }
}

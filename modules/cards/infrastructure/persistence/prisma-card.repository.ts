import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ICardRepository } from '../../domain/repositories/card.repository.interface';
import { Card } from '../../domain/entities/card.entity';
import { CardMapper } from '../mappers/card.mapper';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Concrete adapter for `ICardRepository`, with the platform's standard
 * optimistic-concurrency `save()` (see PrismaLoanRepository /
 * PrismaAccountRepository — same create-if-new,
 * updateMany-with-version-guard pattern used throughout).
 */
@Injectable()
export class PrismaCardRepository implements ICardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Card | null> {
    const record = await this.prisma.card.findUnique({ where: { id } });
    return record ? CardMapper.toDomain(record) : null;
  }

  async findByProviderCardId(providerCardId: string): Promise<Card | null> {
    const record = await this.prisma.card.findUnique({ where: { providerCardId } });
    return record ? CardMapper.toDomain(record) : null;
  }

  async findAllByUserId(userId: string): Promise<Card[]> {
    const records = await this.prisma.card.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record: any) => CardMapper.toDomain(record));
  }

  async save(card: Card): Promise<void> {
    const data = CardMapper.toPersistence(card);
    const previousVersion = data.version - 1;

    if (previousVersion < 0) {
      await this.prisma.card.create({ data });
      return;
    }

    const result = await this.prisma.card.updateMany({
      where: { id: data.id, version: previousVersion },
      data,
    });

    if (result.count === 0) {
      throw new DomainException(
        `Card ${data.id} was modified concurrently; please retry`,
        'CONCURRENT_MODIFICATION',
      );
    }
  }
}

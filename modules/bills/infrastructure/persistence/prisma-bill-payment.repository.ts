import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IBillPaymentRepository,
  BillPaymentPage,
} from '../../domain/repositories/bill-payment.repository.interface';
import { BillPayment } from '../../domain/entities/bill-payment.entity';
import { BillReference } from '../../domain/value-objects/bill-reference.vo';
import { BillPaymentMapper } from '../mappers/bill-payment.mapper';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Concrete adapter for `IBillPaymentRepository`, with the platform's
 * standard optimistic-concurrency `save()` (see PrismaAccountRepository).
 */
@Injectable()
export class PrismaBillPaymentRepository implements IBillPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<BillPayment | null> {
    const record = await this.prisma.billPayment.findUnique({ where: { id } });
    return record ? BillPaymentMapper.toDomain(record) : null;
  }

  async findByReference(reference: BillReference): Promise<BillPayment | null> {
    const record = await this.prisma.billPayment.findUnique({
      where: { reference: reference.getValue() },
    });
    return record ? BillPaymentMapper.toDomain(record) : null;
  }

  async findPageByUserId(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<BillPaymentPage> {
    const where = { userId: params.userId };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.billPayment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.billPayment.count({ where }),
    ]);
    return { billPayments: records.map((record: any) => BillPaymentMapper.toDomain(record)), total };
  }

  async save(billPayment: BillPayment): Promise<void> {
    const data = BillPaymentMapper.toPersistence(billPayment);
    const previousVersion = data.version - 1;

    if (previousVersion < 0) {
      await this.prisma.billPayment.create({ data });
      return;
    }

    const result = await this.prisma.billPayment.updateMany({
      where: { id: data.id, version: previousVersion },
      data,
    });

    if (result.count === 0) {
      throw new DomainException(
        `Bill payment ${data.id} was modified concurrently; please retry`,
        'CONCURRENT_MODIFICATION',
      );
    }
  }
}

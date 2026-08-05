import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ILoanRepository, LoanPage } from '../../domain/repositories/loan.repository.interface';
import { Loan } from '../../domain/entities/loan.entity';
import { LoanMapper } from '../mappers/loan.mapper';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Concrete adapter for `ILoanRepository`, with the platform's standard
 * optimistic-concurrency `save()` (see PrismaAccountRepository /
 * PrismaBillPaymentRepository — same create-if-new,
 * updateMany-with-version-guard pattern used throughout).
 */
@Injectable()
export class PrismaLoanRepository implements ILoanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Loan | null> {
    const record = await this.prisma.loan.findUnique({ where: { id } });
    return record ? LoanMapper.toDomain(record) : null;
  }

  async findByReference(reference: string): Promise<Loan | null> {
    const record = await this.prisma.loan.findUnique({ where: { reference } });
    return record ? LoanMapper.toDomain(record) : null;
  }

  async findPageByUserId(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<LoanPage> {
    const where = { userId: params.userId };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.loan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.loan.count({ where }),
    ]);
    return { loans: records.map((record: any) => LoanMapper.toDomain(record)), total };
  }

  async findPageAll(params: { page: number; limit: number }): Promise<LoanPage> {
    const [records, total] = await this.prisma.$transaction([
      this.prisma.loan.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.loan.count(),
    ]);
    return { loans: records.map((record: any) => LoanMapper.toDomain(record)), total };
  }

  async save(loan: Loan): Promise<void> {
    const data = LoanMapper.toPersistence(loan);
    const previousVersion = data.version - 1;

    if (previousVersion < 0) {
      await this.prisma.loan.create({ data });
      return;
    }

    const result = await this.prisma.loan.updateMany({
      where: { id: data.id, version: previousVersion },
      data,
    });

    if (result.count === 0) {
      throw new DomainException(
        `Loan ${data.id} was modified concurrently; please retry`,
        'CONCURRENT_MODIFICATION',
      );
    }
  }
}

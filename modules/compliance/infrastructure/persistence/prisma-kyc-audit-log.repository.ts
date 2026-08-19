import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IKycAuditLogRepository } from '../../domain/repositories/kyc-audit-log.repository.interface';
import { KycAuditLogEntry } from '../../domain/entities/kyc-audit-log-entry.entity';
import { KycAuditLogMapper } from '../mappers/kyc-audit-log.mapper';

@Injectable()
export class PrismaKycAuditLogRepository implements IKycAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(entry: KycAuditLogEntry): Promise<void> {
    const data = KycAuditLogMapper.toPersistence(entry);
    // Append-only — always a create, never an update.
    await this.prisma.kycAuditLogEntry.create({ data });
  }

  async findByUserId(userId: string): Promise<KycAuditLogEntry[]> {
    const records = await this.prisma.kycAuditLogEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record) => KycAuditLogMapper.toDomain(record));
  }
}

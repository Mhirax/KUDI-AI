import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ISanctionsListRepository,
  SanctionsListEntry,
} from '../../domain/repositories/sanctions-list.repository.interface';

@Injectable()
export class PrismaSanctionsListRepository implements ISanctionsListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllIndividuals(): Promise<SanctionsListEntry[]> {
    const records = await this.prisma.sanctionsListEntry.findMany();
    return records.map((record) => ({
      id: record.id,
      source: record.source,
      externalId: record.externalId,
      fullName: record.fullName,
      program: record.program,
      remarks: record.remarks,
    }));
  }
}

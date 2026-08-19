import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IKycProfileRepository } from '../../domain/repositories/kyc-profile.repository.interface';
import { KycProfile } from '../../domain/entities/kyc-profile.entity';
import { KycProfileMapper } from '../mappers/kyc-profile.mapper';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

@Injectable()
export class PrismaKycProfileRepository implements IKycProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<KycProfile | null> {
    const record = await this.prisma.kycProfile.findUnique({ where: { id } });
    return record ? KycProfileMapper.toDomain(record) : null;
  }

  async findByUserId(userId: string, tx?: any): Promise<KycProfile | null> {
    const client = tx ?? this.prisma;
    const record = await client.kycProfile.findUnique({ where: { userId } });
    return record ? KycProfileMapper.toDomain(record) : null;
  }

  async findAllCurrentlyFlaggedForSanctions(): Promise<KycProfile[]> {
    const records = await this.prisma.kycProfile.findMany({
      where: { sanctionsFlaggedAt: { not: null }, sanctionsClearedAt: null },
      orderBy: { sanctionsFlaggedAt: 'asc' },
    });
    return records.map((record) => KycProfileMapper.toDomain(record));
  }

  async save(profile: KycProfile): Promise<void> {
    const data = KycProfileMapper.toPersistence(profile);
    const previousVersion = data.version - 1;

    if (previousVersion < 0) {
      await this.prisma.kycProfile.create({ data });
      return;
    }

    const result = await this.prisma.kycProfile.updateMany({
      where: { id: data.id, version: previousVersion },
      data,
    });

    if (result.count === 0) {
      throw new DomainException(
        `KYC profile ${data.id} was modified concurrently; please retry`,
        'CONCURRENT_MODIFICATION',
      );
    }
  }
}

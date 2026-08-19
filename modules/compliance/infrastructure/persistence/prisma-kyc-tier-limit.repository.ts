import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IKycTierLimitRepository } from '../../domain/repositories/kyc-tier-limit.repository.interface';
import { KycTier } from '../../domain/enums/kyc-tier.enum';
import { KycTierLimits, getDefaultKycTierLimits } from '../../domain/policies/kyc-tier-limits.policy';
import { KycTierLimitMapper } from '../mappers/kyc-tier-limit.mapper';
import { Currency } from '../../../../shared/enums/currency.enum';

@Injectable()
export class PrismaKycTierLimitRepository implements IKycTierLimitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTier(tier: KycTier, currency: Currency = Currency.NGN): Promise<KycTierLimits> {
    const record = await this.prisma.kycTierLimit.findUnique({ where: { tier } });
    return record ? KycTierLimitMapper.toDomain(record) : getDefaultKycTierLimits(tier, currency);
  }
}

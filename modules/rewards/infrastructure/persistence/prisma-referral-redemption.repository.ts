import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IReferralRedemptionRepository,
  ReferralRedemptionRecord,
} from '../../domain/repositories/referral-redemption.repository.interface';

@Injectable()
export class PrismaReferralRedemptionRepository implements IReferralRedemptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async hasRefereeRedeemed(refereeUserId: string): Promise<boolean> {
    const record = await this.prisma.referralRedemption.findUnique({ where: { refereeUserId } });
    return record !== null;
  }

  async save(record: ReferralRedemptionRecord): Promise<void> {
    await this.prisma.referralRedemption.create({ data: record });
  }
}

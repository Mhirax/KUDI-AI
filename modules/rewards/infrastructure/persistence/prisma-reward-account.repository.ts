import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IRewardAccountRepository } from '../../domain/repositories/reward-account.repository.interface';
import { RewardAccount } from '../../domain/entities/reward-account.entity';
import { RewardAccountMapper } from '../mappers/reward-account.mapper';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

@Injectable()
export class PrismaRewardAccountRepository implements IRewardAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<RewardAccount | null> {
    const record = await this.prisma.rewardAccount.findUnique({ where: { id } });
    return record ? RewardAccountMapper.toDomain(record) : null;
  }

  async findByUserId(userId: string): Promise<RewardAccount | null> {
    const record = await this.prisma.rewardAccount.findUnique({ where: { userId } });
    return record ? RewardAccountMapper.toDomain(record) : null;
  }

  async findByReferralCode(referralCode: string): Promise<RewardAccount | null> {
    const record = await this.prisma.rewardAccount.findUnique({ where: { referralCode } });
    return record ? RewardAccountMapper.toDomain(record) : null;
  }

  async save(account: RewardAccount): Promise<void> {
    const data = RewardAccountMapper.toPersistence(account);
    const previousVersion = data.version - 1;

    if (previousVersion < 0) {
      await this.prisma.rewardAccount.create({ data });
      return;
    }

    const result = await this.prisma.rewardAccount.updateMany({
      where: { id: data.id, version: previousVersion },
      data,
    });

    if (result.count === 0) {
      throw new DomainException(
        `Reward account ${data.id} was modified concurrently; please retry`,
        'CONCURRENT_MODIFICATION',
      );
    }
  }
}

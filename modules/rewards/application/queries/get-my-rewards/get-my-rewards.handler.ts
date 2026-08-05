import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetMyRewardsQuery } from './get-my-rewards.query';
import {
  REWARD_ACCOUNT_REPOSITORY,
  IRewardAccountRepository,
} from '../../../domain/repositories/reward-account.repository.interface';
import { RewardAccount } from '../../../domain/entities/reward-account.entity';
import { RewardSummaryResponseDto } from '../../dto/reward-summary-response.dto';

/**
 * Returns the caller's reward summary, opening a zero-balance
 * RewardAccount on first access (mirroring how a KycProfile is
 * implicitly TIER_1 from registration) so a brand-new user sees a
 * real referral code immediately rather than a 404.
 */
@Injectable()
@QueryHandler(GetMyRewardsQuery)
export class GetMyRewardsHandler implements IQueryHandler<
  GetMyRewardsQuery,
  RewardSummaryResponseDto
> {
  constructor(
    @Inject(REWARD_ACCOUNT_REPOSITORY)
    private readonly rewardAccountRepository: IRewardAccountRepository,
  ) {}

  async execute(query: GetMyRewardsQuery): Promise<RewardSummaryResponseDto> {
    let account = await this.rewardAccountRepository.findByUserId(query.userId);
    if (!account) {
      account = RewardAccount.open(query.userId);
      await this.rewardAccountRepository.save(account);
    }
    return RewardSummaryResponseDto.fromDomain(account);
  }
}

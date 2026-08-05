import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetMyRewardHistoryQuery } from './get-my-reward-history.query';
import {
  REWARD_TRANSACTION_REPOSITORY,
  IRewardTransactionRepository,
} from '../../../domain/repositories/reward-transaction.repository.interface';
import { RewardTransactionResponseDto } from '../../dto/reward-transaction-response.dto';
import { PaginatedResponseDto } from '../../../../../shared/dto/paginated-response.dto';

@Injectable()
@QueryHandler(GetMyRewardHistoryQuery)
export class GetMyRewardHistoryHandler implements IQueryHandler<
  GetMyRewardHistoryQuery,
  PaginatedResponseDto<RewardTransactionResponseDto>
> {
  constructor(
    @Inject(REWARD_TRANSACTION_REPOSITORY)
    private readonly rewardTransactionRepository: IRewardTransactionRepository,
  ) {}

  async execute(
    query: GetMyRewardHistoryQuery,
  ): Promise<PaginatedResponseDto<RewardTransactionResponseDto>> {
    const { transactions, total } = await this.rewardTransactionRepository.findPageByUserId({
      userId: query.userId,
      page: query.page,
      limit: query.limit,
    });
    return {
      data: transactions.map((transaction) => RewardTransactionResponseDto.fromDomain(transaction)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}

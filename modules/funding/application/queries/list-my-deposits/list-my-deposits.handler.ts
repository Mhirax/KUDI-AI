import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListMyDepositsQuery } from './list-my-deposits.query';
import {
  DEPOSIT_REPOSITORY,
  IDepositRepository,
} from '../../../domain/repositories/deposit.repository.interface';
import { DepositResponseDto } from '../../dto/deposit-response.dto';
import { PaginatedResponseDto } from '../../../../../shared/dto/paginated-response.dto';

@Injectable()
@QueryHandler(ListMyDepositsQuery)
export class ListMyDepositsHandler implements IQueryHandler<
  ListMyDepositsQuery,
  PaginatedResponseDto<DepositResponseDto>
> {
  constructor(@Inject(DEPOSIT_REPOSITORY) private readonly depositRepository: IDepositRepository) {}

  async execute(query: ListMyDepositsQuery): Promise<PaginatedResponseDto<DepositResponseDto>> {
    const { deposits, total } = await this.depositRepository.findPageByUserId({
      userId: query.userId,
      page: query.page,
      limit: query.limit,
    });
    return {
      data: deposits.map((deposit) => DepositResponseDto.fromDomain(deposit)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListMyTransfersQuery } from './list-my-transfers.query';
import {
  TRANSFER_REPOSITORY,
  ITransferRepository,
} from '../../../domain/repositories/transfer.repository.interface';
import { TransferResponseDto } from '../../dto/transfer-response.dto';
import { PaginatedResponseDto } from '../../../../../shared/dto/paginated-response.dto';

@Injectable()
@QueryHandler(ListMyTransfersQuery)
export class ListMyTransfersHandler implements IQueryHandler<
  ListMyTransfersQuery,
  PaginatedResponseDto<TransferResponseDto>
> {
  constructor(
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: ITransferRepository,
  ) {}

  async execute(
    query: ListMyTransfersQuery,
  ): Promise<PaginatedResponseDto<TransferResponseDto>> {
    const { transfers, total } = await this.transferRepository.findPageByUserId(
      query.userId,
      (query.page - 1) * query.limit,
      query.limit,
    );

    return {
      data: transfers.map((transfer) => TransferResponseDto.fromDomain(transfer)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }
}

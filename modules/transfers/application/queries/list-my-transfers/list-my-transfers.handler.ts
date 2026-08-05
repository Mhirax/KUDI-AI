import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListMyTransfersQuery } from './list-my-transfers.query';
import {
  TRANSFER_REPOSITORY,
  ITransferRepository,
} from '../../../domain/repositories/transfer.repository.interface';
import { TransferResponseDto } from '../../dto/transfer-response.dto';

@Injectable()
@QueryHandler(ListMyTransfersQuery)
export class ListMyTransfersHandler implements IQueryHandler<
  ListMyTransfersQuery,
  TransferResponseDto[]
> {
  constructor(
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: ITransferRepository,
  ) {}

  async execute(query: ListMyTransfersQuery): Promise<TransferResponseDto[]> {
    const transfers = await this.transferRepository.findAllByUserId(query.userId);
    return transfers.map((transfer) => TransferResponseDto.fromDomain(transfer));
  }
}

import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTransferByReferenceQuery } from './get-transfer-by-reference.query';
import {
  TRANSFER_REPOSITORY,
  ITransferRepository,
} from '../../../domain/repositories/transfer.repository.interface';
import { TransferReference } from '../../../domain/value-objects/transfer-reference.vo';
import { TransferNotFoundException } from '../../../domain/exceptions/transfer-not-found.exception';
import { TransferResponseDto } from '../../dto/transfer-response.dto';

@Injectable()
@QueryHandler(GetTransferByReferenceQuery)
export class GetTransferByReferenceHandler implements IQueryHandler<
  GetTransferByReferenceQuery,
  TransferResponseDto
> {
  constructor(
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: ITransferRepository,
  ) {}

  async execute(query: GetTransferByReferenceQuery): Promise<TransferResponseDto> {
    const reference = TransferReference.create(query.reference);
    const transfer = await this.transferRepository.findByReference(reference);
    if (!transfer) {
      throw new TransferNotFoundException(query.reference);
    }

    if (transfer.initiatorUserId !== query.requestingUserId && !query.isAdmin) {
      throw new ForbiddenException('You may only access your own transfers');
    }

    return TransferResponseDto.fromDomain(transfer);
  }
}

import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLedgerEntryByIdQuery } from './get-ledger-entry-by-id.query';
import {
  ILedgerEntryRepository,
  LEDGER_ENTRY_REPOSITORY,
} from '../../../domain/repositories/ledger-entry.repository.interface';
import { LedgerEntryNotFoundException } from '../../../domain/exceptions/ledger-entry-not-found.exception';
import { LedgerEntryResponseDto } from '../../dto/ledger-entry-response.dto';

/**
 * Single-entry lookup (e.g. a customer taps one transaction in the
 * app). Ownership check uses the entry's own denormalized `userId` —
 * no cross-context account fetch needed here.
 */
@Injectable()
@QueryHandler(GetLedgerEntryByIdQuery)
export class GetLedgerEntryByIdHandler implements IQueryHandler<
  GetLedgerEntryByIdQuery,
  LedgerEntryResponseDto
> {
  constructor(
    @Inject(LEDGER_ENTRY_REPOSITORY) private readonly ledgerRepository: ILedgerEntryRepository,
  ) {}

  async execute(query: GetLedgerEntryByIdQuery): Promise<LedgerEntryResponseDto> {
    const entry = await this.ledgerRepository.findById(query.entryId);
    if (!entry) {
      throw new LedgerEntryNotFoundException(query.entryId);
    }
    if (entry.userId !== query.requestingUserId && !query.isAdmin) {
      throw new ForbiddenException('You may only access your own transactions');
    }
    return LedgerEntryResponseDto.fromDomain(entry);
  }
}

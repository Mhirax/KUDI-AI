import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAccountLedgerQuery } from './get-account-ledger.query';
import {
  ILedgerEntryRepository,
  LEDGER_ENTRY_REPOSITORY,
} from '../../../domain/repositories/ledger-entry.repository.interface';
import { LedgerEntryResponseDto } from '../../dto/ledger-entry-response.dto';
import { PaginatedResponseDto } from '../../../../../shared/dto/paginated-response.dto';

// Cross-module dependency on Accounts' *port* — used only to answer
// "does this account exist and does the caller own it?".
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../../accounts/domain/exceptions/account-not-found.exception';

/**
 * Paginated transaction history for one account. Resource-level
 * authorization lives here in the application layer, mirroring
 * Accounts' GetAccountByIdHandler (see that class's header for why a
 * route guard would be the wrong place).
 */
@Injectable()
@QueryHandler(GetAccountLedgerQuery)
export class GetAccountLedgerHandler implements IQueryHandler<
  GetAccountLedgerQuery,
  PaginatedResponseDto<LedgerEntryResponseDto>
> {
  constructor(
    @Inject(LEDGER_ENTRY_REPOSITORY) private readonly ledgerRepository: ILedgerEntryRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
  ) {}

  async execute(
    query: GetAccountLedgerQuery,
  ): Promise<PaginatedResponseDto<LedgerEntryResponseDto>> {
    const account = await this.accountRepository.findById(query.accountId);
    if (!account) {
      throw new AccountNotFoundException(query.accountId);
    }
    if (account.userId !== query.requestingUserId && !query.isAdmin) {
      throw new ForbiddenException('You may only access your own account history');
    }

    const { entries, total } = await this.ledgerRepository.findPageByAccountId({
      accountId: query.accountId,
      page: query.page,
      limit: query.limit,
      from: query.from,
      to: query.to,
    });

    return {
      data: entries.map((entry) => LedgerEntryResponseDto.fromDomain(entry)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}

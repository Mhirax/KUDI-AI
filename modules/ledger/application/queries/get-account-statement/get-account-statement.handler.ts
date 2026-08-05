import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAccountStatementQuery } from './get-account-statement.query';
import {
  ILedgerEntryRepository,
  LEDGER_ENTRY_REPOSITORY,
} from '../../../domain/repositories/ledger-entry.repository.interface';
import { InvalidStatementPeriodException } from '../../../domain/exceptions/invalid-statement-period.exception';
import { AccountStatementResponseDto } from '../../dto/account-statement-response.dto';
import { LedgerEntryResponseDto } from '../../dto/ledger-entry-response.dto';
import { Money } from '../../../../../shared/value-objects/money.vo';

// Cross-module dependency on Accounts' *port* — existence, ownership,
// and the account's currency for zero-activity statements.
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../../accounts/domain/exceptions/account-not-found.exception';

/** Hard cap so a single statement request cannot dump years of rows in one response. */
const MAX_STATEMENT_DAYS = 366;
/** Matches the entry-list cap a statement can carry inline; longer periods still get correct balances/totals. */
const MAX_INLINE_ENTRIES = 1000;

/**
 * Builds a classic bank statement for a period:
 *
 * - opening balance = `balanceAfter` of the last entry *before* the
 *   period (or, if the account has never moved before it, zero in the
 *   account's currency);
 * - closing balance = `balanceAfter` of the last entry *inside* the
 *   period (or the opening balance if the period had no activity);
 * - totals computed by the database, in minor units, never floats.
 *
 * Balances are anchored to recorded `balanceAfter` values — the ones
 * the Accounts aggregate itself reported — rather than recomputed by
 * summation, so a statement can never disagree with what the account
 * actually held.
 */
@Injectable()
@QueryHandler(GetAccountStatementQuery)
export class GetAccountStatementHandler implements IQueryHandler<
  GetAccountStatementQuery,
  AccountStatementResponseDto
> {
  constructor(
    @Inject(LEDGER_ENTRY_REPOSITORY) private readonly ledgerRepository: ILedgerEntryRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
  ) {}

  async execute(query: GetAccountStatementQuery): Promise<AccountStatementResponseDto> {
    if (query.from.getTime() > query.to.getTime()) {
      throw new InvalidStatementPeriodException('`from` must not be after `to`');
    }
    const periodDays = (query.to.getTime() - query.from.getTime()) / (1000 * 60 * 60 * 24);
    if (periodDays > MAX_STATEMENT_DAYS) {
      throw new InvalidStatementPeriodException(
        `period must not exceed ${MAX_STATEMENT_DAYS} days`,
      );
    }

    const account = await this.accountRepository.findById(query.accountId);
    if (!account) {
      throw new AccountNotFoundException(query.accountId);
    }
    if (account.userId !== query.requestingUserId && !query.isAdmin) {
      throw new ForbiddenException('You may only access your own account statements');
    }

    const currency = account.currency;

    const [entryBefore, lastEntryInPeriod, totals, page] = await Promise.all([
      this.ledgerRepository.findLastEntryBefore(query.accountId, query.from),
      this.ledgerRepository.findLastEntryAtOrBefore(query.accountId, query.to),
      this.ledgerRepository.sumForPeriod(query.accountId, query.from, query.to),
      this.ledgerRepository.findPageByAccountId({
        accountId: query.accountId,
        page: 1,
        limit: MAX_INLINE_ENTRIES,
        from: query.from,
        to: query.to,
      }),
    ]);

    const openingBalance = entryBefore ? entryBefore.balanceAfter : Money.zero(currency);
    // If the period saw no activity, the last entry "at or before `to`"
    // is the same anchor as the opening balance (or null on a
    // never-used account) — either way the closing balance equals the
    // opening one.
    const closingBalance = lastEntryInPeriod ? lastEntryInPeriod.balanceAfter : openingBalance;

    return {
      accountId: query.accountId,
      currency,
      periodStart: query.from.toISOString(),
      periodEnd: query.to.toISOString(),
      openingBalance: openingBalance.toMajorUnitsString(),
      closingBalance: closingBalance.toMajorUnitsString(),
      totalCredits: Money.fromMinorUnits(
        totals.totalCreditsMinorUnits,
        currency,
      ).toMajorUnitsString(),
      totalDebits: Money.fromMinorUnits(
        totals.totalDebitsMinorUnits,
        currency,
      ).toMajorUnitsString(),
      entryCount: totals.entryCount,
      entries: page.entries.map((entry) => LedgerEntryResponseDto.fromDomain(entry)),
    };
  }
}

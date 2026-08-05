import { ForbiddenException } from '@nestjs/common';
import { GetAccountStatementHandler } from './get-account-statement.handler';
import { GetAccountStatementQuery } from './get-account-statement.query';
import { ILedgerEntryRepository } from '../../../domain/repositories/ledger-entry.repository.interface';
import { InvalidStatementPeriodException } from '../../../domain/exceptions/invalid-statement-period.exception';
import { LedgerEntry } from '../../../domain/entities/ledger-entry.entity';
import { EntryDirection } from '../../../domain/enums/entry-direction.enum';
import { Money } from '../../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../../shared/enums/currency.enum';
import { IAccountRepository } from '../../../../accounts/domain/repositories/account.repository.interface';

function entryWithBalanceAfter(balance: string): LedgerEntry {
  return LedgerEntry.record({
    accountId: 'account-1',
    userId: 'user-1',
    direction: EntryDirection.CREDIT,
    amount: Money.fromDecimalString('1.00', Currency.NGN),
    balanceAfter: Money.fromDecimalString(balance, Currency.NGN),
    reference: 'KUDI-ABCDEF0123456789',
    sourceEventId: `event-${balance}`,
    occurredAt: new Date('2026-01-10T00:00:00Z'),
  });
}

describe('GetAccountStatementHandler', () => {
  let ledgerRepository: jest.Mocked<ILedgerEntryRepository>;
  let accountRepository: jest.Mocked<IAccountRepository>;
  let handler: GetAccountStatementHandler;

  const from = new Date('2026-01-01T00:00:00Z');
  const to = new Date('2026-01-31T23:59:59Z');

  beforeEach(() => {
    ledgerRepository = {
      append: jest.fn(),
      findById: jest.fn(),
      findPageByAccountId: jest.fn().mockResolvedValue({ entries: [], total: 0 }),
      findLastEntryBefore: jest.fn().mockResolvedValue(null),
      findLastEntryAtOrBefore: jest.fn().mockResolvedValue(null),
      sumForPeriod: jest.fn().mockResolvedValue({
        totalCreditsMinorUnits: 0n,
        totalDebitsMinorUnits: 0n,
        entryCount: 0,
      }),
    };
    accountRepository = {
      findById: jest.fn().mockResolvedValue({ userId: 'user-1', currency: Currency.NGN }),
      findByAccountNumber: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByAccountNumber: jest.fn(),
      save: jest.fn(),
    };
    handler = new GetAccountStatementHandler(ledgerRepository, accountRepository);
  });

  it('anchors opening/closing balances to recorded balanceAfter values', async () => {
    ledgerRepository.findLastEntryBefore.mockResolvedValue(entryWithBalanceAfter('1000.00'));
    ledgerRepository.findLastEntryAtOrBefore.mockResolvedValue(entryWithBalanceAfter('1750.00'));
    ledgerRepository.sumForPeriod.mockResolvedValue({
      totalCreditsMinorUnits: 100000n,
      totalDebitsMinorUnits: 25000n,
      entryCount: 3,
    });

    const statement = await handler.execute(
      new GetAccountStatementQuery('account-1', 'user-1', false, from, to),
    );

    expect(statement.openingBalance).toBe('1000.00');
    expect(statement.closingBalance).toBe('1750.00');
    expect(statement.totalCredits).toBe('1000.00');
    expect(statement.totalDebits).toBe('250.00');
    expect(statement.entryCount).toBe(3);
  });

  it('produces a zero/zero statement for a never-used account', async () => {
    const statement = await handler.execute(
      new GetAccountStatementQuery('account-1', 'user-1', false, from, to),
    );

    expect(statement.openingBalance).toBe('0.00');
    expect(statement.closingBalance).toBe('0.00');
    expect(statement.entryCount).toBe(0);
  });

  it('rejects an inverted period', async () => {
    await expect(
      handler.execute(new GetAccountStatementQuery('account-1', 'user-1', false, to, from)),
    ).rejects.toThrow(InvalidStatementPeriodException);
  });

  it('rejects a period longer than a year', async () => {
    await expect(
      handler.execute(
        new GetAccountStatementQuery(
          'account-1',
          'user-1',
          false,
          new Date('2024-01-01T00:00:00Z'),
          new Date('2026-01-01T00:00:00Z'),
        ),
      ),
    ).rejects.toThrow(InvalidStatementPeriodException);
  });

  it("denies another user's statement", async () => {
    await expect(
      handler.execute(new GetAccountStatementQuery('account-1', 'someone-else', false, from, to)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows an admin to read any statement', async () => {
    const statement = await handler.execute(
      new GetAccountStatementQuery('account-1', 'someone-else', true, from, to),
    );
    expect(statement.accountId).toBe('account-1');
  });
});

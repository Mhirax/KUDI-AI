import { PrismaLedgerRecorderService } from './prisma-ledger-recorder.service';
import { UnbalancedLedgerPostingException } from './unbalanced-ledger-posting.exception';
import { LedgerEntryDirection } from './ledger-entry-direction.enum';
import { LedgerEntryType } from './ledger-entry-type.enum';
import { Money } from '../value-objects/money.vo';
import { Currency } from '../enums/currency.enum';

describe('PrismaLedgerRecorderService', () => {
  function fakePrismaClient(previousEntry: { balanceAfterMinorUnits: bigint } | null = null) {
    return {
      ledgerEntry: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(previousEntry),
      },
    } as any;
  }

  it('rejects a posting whose debits and credits do not net to zero', async () => {
    const prisma = fakePrismaClient();
    const recorder = new PrismaLedgerRecorderService(prisma);

    await expect(
      recorder.post({
        reference: 'TRF-123',
        narration: 'test',
        userId: 'user-1',
        entryType: LedgerEntryType.TRANSFER,
        legs: [
          {
            accountId: 'account-1',
            direction: LedgerEntryDirection.DEBIT,
            amount: Money.fromDecimalString('100.00', Currency.NGN),
          },
          {
            accountId: 'account-2',
            direction: LedgerEntryDirection.CREDIT,
            amount: Money.fromDecimalString('90.00', Currency.NGN),
          },
        ],
      }),
    ).rejects.toThrow(UnbalancedLedgerPostingException);

    expect(prisma.ledgerEntry.createMany).not.toHaveBeenCalled();
  });

  it('accepts a balanced multi-leg posting and writes one row per leg under a shared journalId', async () => {
    const prisma = fakePrismaClient();
    const recorder = new PrismaLedgerRecorderService(prisma);

    await recorder.post({
      reference: 'TRF-456',
      narration: 'internal transfer with fee',
      userId: 'user-1',
      entryType: LedgerEntryType.TRANSFER,
      legs: [
        {
          accountId: 'source',
          direction: LedgerEntryDirection.DEBIT,
          amount: Money.fromDecimalString('5100.00', Currency.NGN),
          balanceAfter: Money.fromDecimalString('44900.00', Currency.NGN),
        },
        {
          accountId: 'destination',
          direction: LedgerEntryDirection.CREDIT,
          amount: Money.fromDecimalString('5000.00', Currency.NGN),
          balanceAfter: Money.fromDecimalString('15000.00', Currency.NGN),
        },
        {
          accountId: 'system:fee-revenue:NGN',
          direction: LedgerEntryDirection.CREDIT,
          amount: Money.fromDecimalString('100.00', Currency.NGN),
        },
      ],
    });

    expect(prisma.ledgerEntry.createMany).toHaveBeenCalledTimes(1);
    const { data } = prisma.ledgerEntry.createMany.mock.calls[0][0];
    expect(data).toHaveLength(3);

    const journalIds = new Set(data.map((row: { journalId: string }) => row.journalId));
    expect(journalIds.size).toBe(1);
    const sourceEventIds = new Set(data.map((row: { sourceEventId: string }) => row.sourceEventId));
    expect(sourceEventIds.size).toBe(3); // unique per leg

    expect(data[0]).toMatchObject({
      accountId: 'source',
      userId: 'user-1',
      direction: LedgerEntryDirection.DEBIT,
      amountMinorUnits: 510_000n,
      balanceAfterMinorUnits: 4_490_000n,
      entryType: LedgerEntryType.TRANSFER,
      reference: 'TRF-456',
    });
    expect(data[2]).toMatchObject({
      accountId: 'system:fee-revenue:NGN',
      direction: LedgerEntryDirection.CREDIT,
      amountMinorUnits: 10_000n,
      // No prior entry for this synthetic account (mocked findFirst
      // returns null) — running balance starts from zero.
      balanceAfterMinorUnits: 10_000n,
    });
  });

  it("accumulates a synthetic system account's running balance from its own prior entry", async () => {
    const prisma = fakePrismaClient({ balanceAfterMinorUnits: 50_000n });
    const recorder = new PrismaLedgerRecorderService(prisma);

    await recorder.post({
      reference: 'TRF-999',
      narration: 'another fee',
      userId: 'user-2',
      entryType: LedgerEntryType.TRANSFER,
      legs: [
        {
          accountId: 'source-2',
          direction: LedgerEntryDirection.DEBIT,
          amount: Money.fromDecimalString('100.00', Currency.NGN),
          balanceAfter: Money.fromDecimalString('900.00', Currency.NGN),
        },
        {
          accountId: 'system:fee-revenue:NGN',
          direction: LedgerEntryDirection.CREDIT,
          amount: Money.fromDecimalString('100.00', Currency.NGN),
        },
      ],
    });

    const { data } = prisma.ledgerEntry.createMany.mock.calls[0][0];
    const feeLeg = data.find(
      (row: { accountId: string }) => row.accountId === 'system:fee-revenue:NGN',
    );
    expect(feeLeg.balanceAfterMinorUnits).toBe(60_000n); // 50,000 prior + 10,000 credited
  });

  it('posts through the given transaction client instead of the default prisma client when one is provided', async () => {
    const prisma = fakePrismaClient();
    const tx = fakePrismaClient();
    const recorder = new PrismaLedgerRecorderService(prisma);

    await recorder.post(
      {
        reference: 'TRF-789',
        narration: 'test',
        userId: 'user-1',
        entryType: LedgerEntryType.TRANSFER,
        legs: [
          {
            accountId: 'a',
            direction: LedgerEntryDirection.DEBIT,
            amount: Money.fromDecimalString('10.00', Currency.NGN),
            balanceAfter: Money.fromDecimalString('90.00', Currency.NGN),
          },
          {
            accountId: 'b',
            direction: LedgerEntryDirection.CREDIT,
            amount: Money.fromDecimalString('10.00', Currency.NGN),
            balanceAfter: Money.fromDecimalString('10.00', Currency.NGN),
          },
        ],
      },
      tx,
    );

    expect(tx.ledgerEntry.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.ledgerEntry.createMany).not.toHaveBeenCalled();
  });
});

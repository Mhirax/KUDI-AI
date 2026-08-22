import { randomInt, randomUUID } from 'crypto';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { PrismaInternalTransferExecutor } from './prisma-internal-transfer-executor.service';
import { PrismaTransferRepository } from '../persistence/prisma-transfer.repository';
import { MaxBalanceGuardService } from '../../../accounts/infrastructure/services/max-balance-guard.service';
import { PrismaLedgerRecorderService } from '../../../../shared/ledger/prisma-ledger-recorder.service';
import { LedgerEntryDirection } from '../../../../shared/ledger/ledger-entry-direction.enum';
import { SystemLedgerAccount } from '../../../../shared/ledger/system-ledger-account';
import { PrismaKycProfileRepository } from '../../../compliance/infrastructure/persistence/prisma-kyc-profile.repository';
import { PrismaKycTierLimitRepository } from '../../../compliance/infrastructure/persistence/prisma-kyc-tier-limit.repository';
import { KycTierResolverService } from '../../../compliance/infrastructure/services/kyc-tier-resolver.service';
import { MaxBalanceExceededException } from '../../../accounts/domain/exceptions/max-balance-exceeded.exception';
import { KycTier } from '../../../compliance/domain/enums/kyc-tier.enum';
import { InsufficientFundsException } from '../../../../shared/exceptions/insufficient-funds.exception';
import { AccountType } from '../../../accounts/domain/enums/account-type.enum';
import { AccountStatus } from '../../../../shared/enums/account-status.enum';
import { TransactionStatus } from '../../../../shared/enums/transaction-status.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

/**
 * Real Prisma/Postgres integration test (the DB configured in `.env`) —
 * exercises `PrismaInternalTransferExecutor` itself, not just the
 * guards/checkers that run alongside it (see
 * modules/transfers/implementation.md, gap #3 — this file's own class
 * header calls it the highest-risk file in the repo, previously with
 * zero dedicated coverage).
 *
 * Accounts are real DB rows (not in-memory domain objects), since the
 * executor's happy/rollback paths hinge on the actual `$transaction` +
 * optimistic-concurrency `updateMany` behavior against Postgres.
 */
describe('PrismaInternalTransferExecutor (integration)', () => {
  const prisma = new PrismaService();
  const transferRepository = new PrismaTransferRepository(prisma);
  const maxBalanceGuard = new MaxBalanceGuardService(
    new KycTierResolverService(new PrismaKycProfileRepository(prisma)),
    new PrismaKycTierLimitRepository(prisma),
  );
  const ledgerRecorder = new PrismaLedgerRecorderService(prisma);
  const executor = new PrismaInternalTransferExecutor(
    prisma,
    transferRepository,
    maxBalanceGuard,
    ledgerRecorder,
  );

  const createdAccountIds: string[] = [];
  const createdUserIds: string[] = [];
  // Ledger entries against a synthetic system account (e.g. fee
  // revenue) aren't tied to any account in createdAccountIds, so they
  // have to be cleaned up by reference instead.
  const createdTransferReferences: string[] = [];

  // Random start so re-runs against a persisted DB don't collide with
  // accountNumber's unique constraint; monotonic after that so
  // accounts created within one run never collide with each other.
  let accountNumberSeq = randomInt(1_000_000, 9_000_000);

  afterAll(async () => {
    await prisma.transfer.deleteMany({ where: { sourceAccountId: { in: createdAccountIds } } });
    await prisma.ledgerEntry.deleteMany({
      where: { reference: { in: createdTransferReferences } },
    });
    await prisma.account.deleteMany({ where: { id: { in: createdAccountIds } } });
    await prisma.kycProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  function nextAccountNumber(): string {
    accountNumberSeq += 1;
    return accountNumberSeq.toString().padStart(10, '0');
  }

  async function createAccount(userId: string, balanceMajorUnits: string) {
    const record = await prisma.account.create({
      data: {
        userId,
        accountNumber: nextAccountNumber(),
        accountType: AccountType.WALLET,
        currency: Currency.NGN,
        balance: Money.fromDecimalString(balanceMajorUnits, Currency.NGN).getMinorUnits(),
        status: AccountStatus.ACTIVE,
      },
    });
    createdAccountIds.push(record.id);
    return record;
  }

  async function givenUserAtTier(tier: KycTier): Promise<string> {
    const userId = randomUUID();
    await prisma.kycProfile.create({ data: { userId, tier } });
    createdUserIds.push(userId);
    return userId;
  }

  it('debits the source and credits the destination on a successful transfer', async () => {
    const source = await createAccount(randomUUID(), '50000.00');
    const destination = await createAccount(randomUUID(), '10000.00');

    const result = await executor.execute({
      initiatorUserId: source.userId,
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: Money.fromDecimalString('5000.00', Currency.NGN),
      fee: Money.fromDecimalString('100.00', Currency.NGN),
      narration: 'test transfer',
    });

    expect(result.transfer.status).toBe(TransactionStatus.SUCCESSFUL);
    createdTransferReferences.push(result.transfer.reference.getValue());

    const sourceAfter = await prisma.account.findUnique({ where: { id: source.id } });
    const destinationAfter = await prisma.account.findUnique({ where: { id: destination.id } });

    expect(sourceAfter?.balance).toBe(4_490_000n); // 50000.00 - (5000.00 + 100.00), in kobo
    expect(sourceAfter?.version).toBe(1);
    expect(destinationAfter?.balance).toBe(1_500_000n); // 10000.00 + 5000.00, in kobo
    expect(destinationAfter?.version).toBe(1);

    const persistedTransfer = await prisma.transfer.findUnique({
      where: { id: result.transfer.id },
    });
    expect(persistedTransfer?.status).toBe(TransactionStatus.SUCCESSFUL);

    // Double-entry journal: debit(amount+fee) from source must equal
    // credit(amount) to destination + credit(fee) to fee-revenue.
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { reference: result.transfer.reference.getValue() },
    });
    expect(ledgerEntries).toHaveLength(3);
    const journalIds = new Set(ledgerEntries.map((entry) => entry.journalId));
    expect(journalIds.size).toBe(1);

    const sourceLeg = ledgerEntries.find((entry) => entry.accountId === source.id);
    expect(sourceLeg).toMatchObject({
      userId: source.userId,
      direction: LedgerEntryDirection.DEBIT,
      amountMinorUnits: 510_000n,
      balanceAfterMinorUnits: 4_490_000n,
    });

    const destinationLeg = ledgerEntries.find((entry) => entry.accountId === destination.id);
    expect(destinationLeg).toMatchObject({
      userId: source.userId, // every leg is tagged with the initiating user, not the account owner
      direction: LedgerEntryDirection.CREDIT,
      amountMinorUnits: 500_000n,
      balanceAfterMinorUnits: 1_500_000n,
    });

    // The fee-revenue system account is shared/accumulating across every
    // posting ever made to it (not scoped to this test), so its running
    // balance can't be pinned to an exact value here — only that this
    // leg's own amount/direction are correct and it has *some* running
    // total computed (proving PrismaLedgerRecorderService's
    // computeRunningBalance path actually ran for a synthetic account).
    const feeLeg = ledgerEntries.find(
      (entry) => entry.accountId === SystemLedgerAccount.feeRevenue(Currency.NGN),
    );
    expect(feeLeg).toMatchObject({
      userId: source.userId,
      direction: LedgerEntryDirection.CREDIT,
      amountMinorUnits: 10_000n,
    });
    expect(typeof feeLeg?.balanceAfterMinorUnits).toBe('bigint');
  });

  it('rejects for insufficient funds and leaves both balances unchanged', async () => {
    const source = await createAccount(randomUUID(), '1000.00');
    const destination = await createAccount(randomUUID(), '2000.00');

    let thrown: unknown;
    try {
      await executor.execute({
        initiatorUserId: source.userId,
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: Money.fromDecimalString('5000.00', Currency.NGN),
        fee: Money.fromDecimalString('0.00', Currency.NGN),
        narration: 'test transfer over balance',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(InsufficientFundsException);

    const sourceAfter = await prisma.account.findUnique({ where: { id: source.id } });
    const destinationAfter = await prisma.account.findUnique({ where: { id: destination.id } });

    expect(sourceAfter?.balance).toBe(100_000n); // unchanged
    expect(sourceAfter?.version).toBe(0);
    expect(destinationAfter?.balance).toBe(200_000n); // unchanged
    expect(destinationAfter?.version).toBe(0);

    const failedTransfer = await prisma.transfer.findFirst({
      where: { sourceAccountId: source.id },
    });
    expect(failedTransfer?.status).toBe(TransactionStatus.FAILED);
    expect(failedTransfer?.failureReason).toContain('insufficient funds');
  });

  it('rolls back the source debit when the max-balance guard rejects the destination credit mid-transaction', async () => {
    const source = await createAccount(randomUUID(), '50000.00');
    const destinationUserId = await givenUserAtTier(KycTier.TIER_1);
    // Tier 1's max balance is ₦300,000 (see max-balance-guard.service.integration-spec.ts);
    // a ₦10,000 credit on top of this pushes it over.
    const destination = await createAccount(destinationUserId, '295000.00');

    let thrown: unknown;
    try {
      await executor.execute({
        initiatorUserId: source.userId,
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: Money.fromDecimalString('10000.00', Currency.NGN),
        fee: Money.fromDecimalString('0.00', Currency.NGN),
        narration: 'test transfer over max balance',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(MaxBalanceExceededException);

    const sourceAfter = await prisma.account.findUnique({ where: { id: source.id } });
    const destinationAfter = await prisma.account.findUnique({ where: { id: destination.id } });

    // The source debit happens earlier in the same $transaction than
    // the guard check — proving it rolls back too, not just that the
    // destination credit never landed.
    expect(sourceAfter?.balance).toBe(5_000_000n); // unchanged
    expect(sourceAfter?.version).toBe(0);
    expect(destinationAfter?.balance).toBe(29_500_000n); // unchanged
    expect(destinationAfter?.version).toBe(0);

    const failedTransfer = await prisma.transfer.findFirst({
      where: { sourceAccountId: source.id },
    });
    expect(failedTransfer?.status).toBe(TransactionStatus.FAILED);

    // No ledger rows for a posting that never happened — the guard
    // rejects before the ledgerRecorder.post() call is ever reached.
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { accountId: { in: [source.id, destination.id] } },
    });
    expect(ledgerEntries).toHaveLength(0);
  });
});

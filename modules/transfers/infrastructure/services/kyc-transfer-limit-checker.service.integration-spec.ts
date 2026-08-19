import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { KycTransferLimitCheckerService } from './kyc-transfer-limit-checker.service';
import { PrismaTransferRepository } from '../persistence/prisma-transfer.repository';
import { PrismaKycProfileRepository } from '../../../compliance/infrastructure/persistence/prisma-kyc-profile.repository';
import { PrismaKycTierLimitRepository } from '../../../compliance/infrastructure/persistence/prisma-kyc-tier-limit.repository';
import { TransferLimitExceededException } from '../../domain/exceptions/transfer-limit-exceeded.exception';
import { KycTier } from '../../../compliance/domain/enums/kyc-tier.enum';
import { TransferType } from '../../domain/enums/transfer-type.enum';
import { TransactionStatus } from '../../../../shared/enums/transaction-status.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

/**
 * Real Prisma/Postgres integration test (the DB configured in `.env`) —
 * exercises KycTransferLimitCheckerService against the actual seeded
 * KycTierLimit rows and real KycProfile/Transfer rows, not mocks. See
 * modules/compliance/implementation.md, Phase 1f.
 *
 * Creates and cleans up its own fixture rows; does not touch anything
 * else in the database.
 */
describe('KycTransferLimitCheckerService (integration)', () => {
  const prisma = new PrismaService();
  const checker = new KycTransferLimitCheckerService(
    new PrismaKycProfileRepository(prisma),
    new PrismaKycTierLimitRepository(prisma),
    new PrismaTransferRepository(prisma),
  );

  const createdUserIds: string[] = [];
  const createdTransferIds: string[] = [];

  afterAll(async () => {
    await prisma.transfer.deleteMany({ where: { id: { in: createdTransferIds } } });
    await prisma.kycProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function givenTier1User(): Promise<string> {
    const userId = randomUUID();
    await prisma.kycProfile.create({ data: { userId, tier: KycTier.TIER_1 } });
    createdUserIds.push(userId);
    return userId;
  }

  async function givenPriorTransfer(sourceAccountId: string, majorUnitsAmount: string): Promise<void> {
    const record = await prisma.transfer.create({
      data: {
        reference: `test-${randomUUID()}`,
        type: TransferType.INTERNAL,
        initiatorUserId: randomUUID(),
        sourceAccountId,
        amountMinorUnits: Money.fromDecimalString(majorUnitsAmount, Currency.NGN).getMinorUnits(),
        feeMinorUnits: 0n,
        currency: Currency.NGN,
        narration: 'integration test fixture',
        status: TransactionStatus.SUCCESSFUL,
      },
    });
    createdTransferIds.push(record.id);
  }

  it('rejects a transfer above the Tier 1 per-transaction limit (₦50,000)', async () => {
    const userId = await givenTier1User();
    const sourceAccountId = randomUUID();

    await expect(
      checker.assertWithinLimits({
        userId,
        sourceAccountId,
        amount: Money.fromDecimalString('60000.00', Currency.NGN),
      }),
    ).rejects.toThrow(/per-transaction limit/);
  });

  it('rejects a transfer that would push the rolling 24h total past the Tier 1 daily limit (₦50,000)', async () => {
    const userId = await givenTier1User();
    const sourceAccountId = randomUUID();
    await givenPriorTransfer(sourceAccountId, '30000.00');

    // 30,000 already moved today + 40,000 now = 70,000 > 50,000 daily cap.
    // Individually under the ₦50,000 per-transaction limit, so a
    // per-transaction rejection can't be what's firing here.
    await expect(
      checker.assertWithinLimits({
        userId,
        sourceAccountId,
        amount: Money.fromDecimalString('40000.00', Currency.NGN),
      }),
    ).rejects.toThrow(/daily limit/);
  });

  it('allows a transfer within both the per-transaction and daily limits', async () => {
    const userId = await givenTier1User();
    const sourceAccountId = randomUUID();

    await expect(
      checker.assertWithinLimits({
        userId,
        sourceAccountId,
        amount: Money.fromDecimalString('10000.00', Currency.NGN),
      }),
    ).resolves.toBeUndefined();
  });

  it('falls back to the most restrictive tier (TIER_1) when the user has no KYC profile', async () => {
    const userIdWithNoProfile = randomUUID();

    await expect(
      checker.assertWithinLimits({
        userId: userIdWithNoProfile,
        sourceAccountId: randomUUID(),
        amount: Money.fromDecimalString('60000.00', Currency.NGN),
      }),
    ).rejects.toThrow(TransferLimitExceededException);
  });
});

import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { MaxBalanceGuardService } from './max-balance-guard.service';
import { PrismaKycProfileRepository } from '../../../compliance/infrastructure/persistence/prisma-kyc-profile.repository';
import { PrismaKycTierLimitRepository } from '../../../compliance/infrastructure/persistence/prisma-kyc-tier-limit.repository';
import { KycTierResolverService } from '../../../compliance/infrastructure/services/kyc-tier-resolver.service';
import { MaxBalanceExceededException } from '../../domain/exceptions/max-balance-exceeded.exception';
import { KycTier } from '../../../compliance/domain/enums/kyc-tier.enum';
import { Account } from '../../domain/entities/account.entity';
import { AccountNumber } from '../../domain/value-objects/account-number.vo';
import { AccountType } from '../../domain/enums/account-type.enum';
import { AccountStatus } from '../../../../shared/enums/account-status.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

/**
 * Real Prisma/Postgres integration test (the DB configured in `.env`) —
 * exercises MaxBalanceGuardService against the actual seeded
 * KycTierLimit rows and real KycProfile rows, not mocks. The Account
 * itself is an in-memory domain object (assertWithinLimit only reads
 * its getters, never persists it), so no Account/User fixture rows are
 * needed. See modules/compliance/implementation.md, Phase 1f.
 */
describe('MaxBalanceGuardService (integration)', () => {
  const prisma = new PrismaService();
  const guard = new MaxBalanceGuardService(
    new KycTierResolverService(new PrismaKycProfileRepository(prisma)),
    new PrismaKycTierLimitRepository(prisma),
  );

  const createdUserIds: string[] = [];

  afterAll(async () => {
    await prisma.kycProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function givenUserAtTier(tier: KycTier): Promise<string> {
    const userId = randomUUID();
    await prisma.kycProfile.create({ data: { userId, tier } });
    createdUserIds.push(userId);
    return userId;
  }

  function accountWithBalance(userId: string, balanceMajorUnits: string): Account {
    return Account.reconstitute({
      id: randomUUID(),
      userId,
      accountNumber: AccountNumber.create('1234567890'),
      accountType: AccountType.WALLET,
      currency: Currency.NGN,
      balance: Money.fromDecimalString(balanceMajorUnits, Currency.NGN),
      status: AccountStatus.ACTIVE,
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  it('rejects a credit that would push a Tier 1 account past the ₦300,000 max balance', async () => {
    const userId = await givenUserAtTier(KycTier.TIER_1);
    const account = accountWithBalance(userId, '290000.00');

    await expect(
      guard.assertWithinLimit(account, Money.fromDecimalString('20000.00', Currency.NGN)),
    ).rejects.toThrow(MaxBalanceExceededException);
  });

  it('allows a credit that stays within the Tier 1 max balance', async () => {
    const userId = await givenUserAtTier(KycTier.TIER_1);
    const account = accountWithBalance(userId, '290000.00');

    await expect(
      guard.assertWithinLimit(account, Money.fromDecimalString('5000.00', Currency.NGN)),
    ).resolves.toBeUndefined();
  });

  it('never rejects on balance for a Tier 3 account (uncapped)', async () => {
    const userId = await givenUserAtTier(KycTier.TIER_3);
    const account = accountWithBalance(userId, '50000000.00');

    await expect(
      guard.assertWithinLimit(account, Money.fromDecimalString('10000000.00', Currency.NGN)),
    ).resolves.toBeUndefined();
  });

  it('falls back to the most restrictive tier (TIER_1) when the account holder has no KYC profile', async () => {
    const userIdWithNoProfile = randomUUID();
    const account = accountWithBalance(userIdWithNoProfile, '290000.00');

    await expect(
      guard.assertWithinLimit(account, Money.fromDecimalString('20000.00', Currency.NGN)),
    ).rejects.toThrow(MaxBalanceExceededException);
  });
});

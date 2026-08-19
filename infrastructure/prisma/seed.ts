import { PrismaClient } from '@prisma/client';
import { KycTier } from '../../modules/compliance/domain/enums/kyc-tier.enum';
import { getDefaultKycTierLimits } from '../../modules/compliance/domain/policies/kyc-tier-limits.policy';
import { Currency } from '../../shared/enums/currency.enum';

const prisma = new PrismaClient();

/**
 * Seeds `KycTierLimit` from the default figures in
 * `modules/compliance/domain/policies/kyc-tier-limits.policy.ts`. Safe to
 * re-run — upserts by tier. See `modules/compliance/implementation.md`,
 * Phase 1, for why these are defaults pending compliance sign-off, not
 * final figures.
 */
async function seedKycTierLimits(): Promise<void> {
  const tiers = Object.values(KycTier);
  for (const tier of tiers) {
    const limits = getDefaultKycTierLimits(tier, Currency.NGN);
    await prisma.kycTierLimit.upsert({
      where: { tier },
      create: {
        tier,
        currency: Currency.NGN,
        perTransactionLimit: limits.perTransactionLimit?.getMinorUnits() ?? null,
        dailyTransferLimit: limits.dailyTransferLimit?.getMinorUnits() ?? null,
        maxBalance: limits.maxBalance?.getMinorUnits() ?? null,
      },
      update: {},
    });
  }
  console.log(`Seeded ${tiers.length} KycTierLimit rows (upserted).`);
}

async function main(): Promise<void> {
  await seedKycTierLimits();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

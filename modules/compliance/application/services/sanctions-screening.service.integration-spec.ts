import { randomUUID } from 'crypto';
import { EventBus } from '@nestjs/cqrs';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { SanctionsScreeningService } from './sanctions-screening.service';
import { OfacSanctionsScreeningProvider } from '../../infrastructure/services/ofac-sanctions-screening.service';
import { PrismaSanctionsListRepository } from '../../infrastructure/persistence/prisma-sanctions-list.repository';
import { PrismaKycProfileRepository } from '../../infrastructure/persistence/prisma-kyc-profile.repository';
import { PrismaKycAuditLogRepository } from '../../infrastructure/persistence/prisma-kyc-audit-log.repository';
import { ClearSanctionsFlagHandler } from '../commands/clear-sanctions-flag/clear-sanctions-flag.handler';
import { ClearSanctionsFlagCommand } from '../commands/clear-sanctions-flag/clear-sanctions-flag.command';
import { GetFlaggedSanctionsProfilesHandler } from '../queries/get-flagged-sanctions-profiles/get-flagged-sanctions-profiles.handler';
import { KycProfile } from '../../domain/entities/kyc-profile.entity';
import { KycTier } from '../../domain/enums/kyc-tier.enum';
import { KycAuditEventType } from '../../domain/enums/kyc-audit-event-type.enum';
import { KycAuditOutcome } from '../../domain/enums/kyc-audit-outcome.enum';
import { SanctionsFlagNotOpenException } from '../../domain/exceptions/sanctions-flag-not-open.exception';

/**
 * Real Prisma/Postgres integration test (the DB configured in `.env`)
 * for Phase 4 — exercises screening against the actual seeded OFAC SDN
 * data (not a stub or a fabricated fixture list), plus the real
 * flag/clear/review-queue flow. See
 * modules/compliance/implementation.md, Phase 4.
 */
describe('Sanctions screening (integration)', () => {
  const prisma = new PrismaService();
  const kycProfileRepository = new PrismaKycProfileRepository(prisma);
  const auditLogRepository = new PrismaKycAuditLogRepository(prisma);
  const sanctionsListRepository = new PrismaSanctionsListRepository(prisma);
  const screeningProvider = new OfacSanctionsScreeningProvider(sanctionsListRepository);
  const fakeEventBus = { publish: () => undefined } as unknown as EventBus;
  const sanctionsScreening = new SanctionsScreeningService(
    screeningProvider,
    kycProfileRepository,
    auditLogRepository,
    fakeEventBus,
  );
  const clearFlagHandler = new ClearSanctionsFlagHandler(kycProfileRepository, auditLogRepository, fakeEventBus);
  const flaggedQueueHandler = new GetFlaggedSanctionsProfilesHandler(kycProfileRepository);

  const createdUserIds: string[] = [];

  afterAll(async () => {
    await prisma.kycAuditLogEntry.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.kycProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function givenProfile(): Promise<KycProfile> {
    const userId = randomUUID();
    createdUserIds.push(userId);
    await prisma.kycProfile.create({ data: { userId, tier: KycTier.TIER_1 } });
    const found = await kycProfileRepository.findByUserId(userId);
    return found!;
  }

  describe('OfacSanctionsScreeningProvider against the real seeded list', () => {
    it('matches a real OFAC SDN individual regardless of name-token order', async () => {
      // A real entry in the seeded data: "AL ZAWAHIRI, Dr. Ayman" (SDGT).
      const result = await screeningProvider.screen('Ayman Al Zawahiri');
      expect(result.matched).toBe(true);
      expect(result.matches.some((m) => m.fullName.includes('ZAWAHIRI'))).toBe(true);
      expect(result.matches[0].program).toBe('SDGT');
    });

    it('does not match an ordinary unrelated name', async () => {
      const result = await screeningProvider.screen('Chinedu Adaeze Okonkwo');
      expect(result.matched).toBe(false);
      expect(result.matches).toEqual([]);
    });

    it('treats a single-word name as unscreenable rather than a noisy false positive', async () => {
      const result = await screeningProvider.screen('Zawahiri');
      expect(result.matched).toBe(false);
    });
  });

  describe('SanctionsScreeningService.screenAndFlag', () => {
    it('flags the profile and records a FAILED audit entry on a real match', async () => {
      const profile = await givenProfile();

      await sanctionsScreening.screenAndFlag(profile, 'Ayman Al Zawahiri');

      const reloaded = await kycProfileRepository.findByUserId(profile.userId);
      expect(reloaded!.isCurrentlyFlaggedForSanctions).toBe(true);

      const history = await auditLogRepository.findByUserId(profile.userId);
      const screeningEntry = history.find((e) => e.toProps().eventType === KycAuditEventType.SANCTIONS_SCREENING);
      expect(screeningEntry).toBeDefined();
      const props = screeningEntry!.toProps();
      expect(props.outcome).toBe(KycAuditOutcome.FAILED);
      expect(props.notes).toContain('ZAWAHIRI');
      expect(props.performedByUserId).toBeNull();
    });

    it('records a PASSED audit entry and does not flag on a clean name', async () => {
      const profile = await givenProfile();

      await sanctionsScreening.screenAndFlag(profile, 'Chinedu Adaeze Okonkwo');

      const reloaded = await kycProfileRepository.findByUserId(profile.userId);
      expect(reloaded!.isCurrentlyFlaggedForSanctions).toBe(false);

      const history = await auditLogRepository.findByUserId(profile.userId);
      expect(history).toHaveLength(1);
      expect(history[0].toProps().outcome).toBe(KycAuditOutcome.PASSED);
    });
  });

  describe('ClearSanctionsFlagHandler + review queue', () => {
    it('lists only currently-open flags, and clearing removes a profile from the queue', async () => {
      const flaggedProfile = await givenProfile();
      const staffUserId = randomUUID();
      await sanctionsScreening.screenAndFlag(flaggedProfile, 'Ayman Al Zawahiri');

      const queueBeforeClear = await flaggedQueueHandler.execute();
      expect(queueBeforeClear.some((p) => p.userId === flaggedProfile.userId)).toBe(true);

      await clearFlagHandler.execute(
        new ClearSanctionsFlagCommand(staffUserId, flaggedProfile.userId, 'Confirmed different person — DOB and nationality do not match.'),
      );

      const queueAfterClear = await flaggedQueueHandler.execute();
      expect(queueAfterClear.some((p) => p.userId === flaggedProfile.userId)).toBe(false);

      const reloaded = await kycProfileRepository.findByUserId(flaggedProfile.userId);
      expect(reloaded!.isCurrentlyFlaggedForSanctions).toBe(false);

      const history = await auditLogRepository.findByUserId(flaggedProfile.userId);
      const clearEntry = history.find((e) => e.toProps().performedByUserId === staffUserId);
      expect(clearEntry).toBeDefined();
      expect(clearEntry!.toProps().notes).toContain('Confirmed different person');
    });

    it('throws when clearing a profile with no open flag', async () => {
      const cleanProfile = await givenProfile();
      await expect(
        clearFlagHandler.execute(
          new ClearSanctionsFlagCommand(randomUUID(), cleanProfile.userId, 'nothing to clear here'),
        ),
      ).rejects.toThrow(SanctionsFlagNotOpenException);
    });
  });
});

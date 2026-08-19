import { randomUUID } from 'crypto';
import { EventBus } from '@nestjs/cqrs';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { ManuallyVerifyBvnHandler } from './manually-verify-bvn.handler';
import { ManuallyVerifyBvnCommand } from './manually-verify-bvn.command';
import { ManuallyVerifyNinHandler } from '../manually-verify-nin/manually-verify-nin.handler';
import { ManuallyVerifyNinCommand } from '../manually-verify-nin/manually-verify-nin.command';
import { PrismaKycProfileRepository } from '../../../infrastructure/persistence/prisma-kyc-profile.repository';
import { PrismaKycAuditLogRepository } from '../../../infrastructure/persistence/prisma-kyc-audit-log.repository';
import { PrismaSanctionsListRepository } from '../../../infrastructure/persistence/prisma-sanctions-list.repository';
import { KycAuditRecorderService } from '../../services/kyc-audit-recorder.service';
import { SanctionsScreeningService } from '../../services/sanctions-screening.service';
import { OfacSanctionsScreeningProvider } from '../../../infrastructure/services/ofac-sanctions-screening.service';
import { IUserRepository } from '../../../../identity/domain/repositories/user.repository.interface';
import { User } from '../../../../identity/domain/entities/user.entity';
import { IIdentityVerificationProvider } from '../../../domain/services/identity-verification-provider.interface';
import { KycTier } from '../../../domain/enums/kyc-tier.enum';
import { KycAuditEventType } from '../../../domain/enums/kyc-audit-event-type.enum';
import { KycAuditOutcome } from '../../../domain/enums/kyc-audit-outcome.enum';
import { VerificationType } from '../../../domain/enums/verification-type.enum';

/**
 * Real Prisma/Postgres integration test (the DB configured in `.env`)
 * for Phase 5b's manual-override handlers — exercises real
 * KycProfile/KycAuditLogEntry persistence, not mocks. Identity's user
 * lookup and the Flutterwave provider call are stubbed: they're
 * external/cross-module boundaries this test isn't responsible for
 * (the provider call itself is unchanged from the already-existing,
 * already-used SubmitBvnVerificationHandler/SubmitNinVerificationHandler),
 * and hitting the real Flutterwave API from an automated test run
 * isn't something this codebase does anywhere else either.
 *
 * The one thing genuinely worth proving here: the handler ignores
 * `result.matched` entirely (the whole point of the override) and
 * still ends up with a correctly-recorded, attributable audit entry.
 */
describe('Manual KYC verification override (integration)', () => {
  const prisma = new PrismaService();
  const kycProfileRepository = new PrismaKycProfileRepository(prisma);
  const auditLogRepository = new PrismaKycAuditLogRepository(prisma);
  const auditRecorder = new KycAuditRecorderService(auditLogRepository);
  const fakeEventBus = { publish: () => undefined } as unknown as EventBus;
  // Real sanctions screening against the actual seeded OFAC list — this
  // test's fixture names ("Registered Name" etc.) aren't on it, so it's
  // a harmless real check, not something worth stubbing out.
  const sanctionsScreening = new SanctionsScreeningService(
    new OfacSanctionsScreeningProvider(new PrismaSanctionsListRepository(prisma)),
    kycProfileRepository,
    auditLogRepository,
    fakeEventBus,
  );

  const createdUserIds: string[] = [];

  afterAll(async () => {
    await prisma.kycAuditLogEntry.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.kycProfile.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  function stubUserRepository(firstName: string, lastName: string): IUserRepository {
    return {
      findById: async (id: string) =>
        User.reconstitute({
          id,
          email: `${id}@example.test`,
          phoneNumber: `+234${id.slice(0, 10)}`,
          passwordHash: 'unused-in-this-test',
          firstName,
          lastName,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any),
      findByEmail: async () => null,
      existsByEmail: async () => false,
      save: async () => undefined,
    };
  }

  function stubVerificationProvider(matched: boolean, verifiedFullName: string | null): IIdentityVerificationProvider {
    return {
      verifyBvn: async () => ({ matched, verifiedFullName }),
      verifyNin: async () => ({ matched, verifiedFullName }),
    };
  }

  async function givenTier1Profile(): Promise<{ userId: string; kycProfileId: string }> {
    const userId = randomUUID();
    createdUserIds.push(userId);
    const record = await prisma.kycProfile.create({ data: { userId, tier: KycTier.TIER_1 } });
    return { userId, kycProfileId: record.id };
  }

  it('records a BVN pass and attributes it to the staff member, even though the provider reports no name match', async () => {
    const { userId } = await givenTier1Profile();
    const staffUserId = randomUUID();

    const handler = new ManuallyVerifyBvnHandler(
      kycProfileRepository,
      auditLogRepository,
      stubUserRepository('Registered', 'Name'),
      stubVerificationProvider(false, 'Totally Different Name'),
      auditRecorder,
      sanctionsScreening,
      fakeEventBus,
    );

    const status = await handler.execute(
      new ManuallyVerifyBvnCommand(staffUserId, userId, '12345678901', 'Confirmed identity via phone call and uploaded ID.'),
    );
    expect(status.bvnVerified).toBe(true);
    expect(status.tier).toBe(KycTier.TIER_2);

    const history = await auditLogRepository.findByUserId(userId);
    const overrideEntry = history.find(
      (entry) => entry.toProps().eventType === KycAuditEventType.VERIFICATION_ATTEMPT,
    );
    expect(overrideEntry).toBeDefined();
    const props = overrideEntry!.toProps();
    expect(props.outcome).toBe(KycAuditOutcome.PASSED);
    expect(props.verificationType).toBe(VerificationType.BVN);
    expect(props.performedByUserId).toBe(staffUserId);
    expect(props.notes).toContain('Confirmed identity via phone call');
    expect(props.notes).toContain('Totally Different Name');

    const tierChangeEntry = history.find((entry) => entry.toProps().eventType === KycAuditEventType.TIER_CHANGE);
    expect(tierChangeEntry).toBeDefined();
    expect(tierChangeEntry!.toProps().performedByUserId).toBeNull();
  });

  it('does not write a duplicate routine VERIFICATION_ATTEMPT row alongside the override entry', async () => {
    const { userId } = await givenTier1Profile();
    const staffUserId = randomUUID();

    const handler = new ManuallyVerifyBvnHandler(
      kycProfileRepository,
      auditLogRepository,
      stubUserRepository('Registered', 'Name'),
      stubVerificationProvider(true, 'Registered Name'),
      auditRecorder,
      sanctionsScreening,
      fakeEventBus,
    );

    await handler.execute(
      new ManuallyVerifyBvnCommand(staffUserId, userId, '10987654321', 'Routine staff-assisted verification.'),
    );

    const history = await auditLogRepository.findByUserId(userId);
    const attemptRows = history.filter((entry) => entry.toProps().eventType === KycAuditEventType.VERIFICATION_ATTEMPT);
    expect(attemptRows).toHaveLength(1);
  });

  it('records a NIN manual override, mirroring the BVN path', async () => {
    const { userId, kycProfileId } = await givenTier1Profile();
    // NIN alone doesn't advance tier without BVN already verified — verify that invariant still holds under the manual path too.
    await prisma.kycProfile.update({ where: { id: kycProfileId }, data: { tier: KycTier.TIER_1 } });
    const staffUserId = randomUUID();

    const handler = new ManuallyVerifyNinHandler(
      kycProfileRepository,
      auditLogRepository,
      stubUserRepository('Registered', 'Name'),
      stubVerificationProvider(false, 'Mismatched Name'),
      auditRecorder,
      sanctionsScreening,
      fakeEventBus,
    );

    const status = await handler.execute(
      new ManuallyVerifyNinCommand(staffUserId, userId, '11223344556', 'Confirmed via uploaded national ID card.'),
    );
    expect(status.ninVerified).toBe(true);
    // Still TIER_1: BVN was never verified for this profile, matching
    // KycProfile.recordNinVerified()'s existing progression rule.
    expect(status.tier).toBe(KycTier.TIER_1);

    const history = await auditLogRepository.findByUserId(userId);
    const overrideEntry = history.find((entry) => entry.toProps().verificationType === VerificationType.NIN);
    expect(overrideEntry!.toProps().performedByUserId).toBe(staffUserId);
  });
});

import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { PrismaKycAuditLogRepository } from '../../infrastructure/persistence/prisma-kyc-audit-log.repository';
import { RecordVerificationAuditHandler } from './record-verification-audit.handler';
import { RecordTierChangeAuditHandler } from './record-tier-change-audit.handler';
import { GetKycAuditHistoryHandler } from '../queries/get-kyc-audit-history/get-kyc-audit-history.handler';
import { GetKycAuditHistoryQuery } from '../queries/get-kyc-audit-history/get-kyc-audit-history.query';
import { VerificationPassedEvent } from '../../domain/events/verification-passed.event';
import { VerificationFailedEvent } from '../../domain/events/verification-failed.event';
import { KycTierUpgradedEvent } from '../../domain/events/kyc-tier-upgraded.event';
import { VerificationType } from '../../domain/enums/verification-type.enum';
import { KycTier } from '../../domain/enums/kyc-tier.enum';
import { KycAuditEventType } from '../../domain/enums/kyc-audit-event-type.enum';
import { KycAuditOutcome } from '../../domain/enums/kyc-audit-outcome.enum';

/**
 * Real Prisma/Postgres integration test (the DB configured in `.env`) —
 * exercises the two audit event handlers and the history query against
 * the real kyc_audit_log table, not mocks. See
 * modules/compliance/implementation.md, Phase 3.
 *
 * Handlers are instantiated directly (not via NestJS's EventBus) so the
 * test is deterministic — publishing through the real CQRS EventBus
 * doesn't await handler completion, which would make assertions racy.
 */
describe('KYC audit trail (integration)', () => {
  const prisma = new PrismaService();
  const auditLogRepository = new PrismaKycAuditLogRepository(prisma);
  const verificationHandler = new RecordVerificationAuditHandler(auditLogRepository);
  const tierChangeHandler = new RecordTierChangeAuditHandler(auditLogRepository);
  const historyHandler = new GetKycAuditHistoryHandler(auditLogRepository);

  const createdUserIds: string[] = [];

  afterAll(async () => {
    await prisma.kycAuditLogEntry.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it('records a passed verification attempt', async () => {
    const userId = randomUUID();
    createdUserIds.push(userId);
    const kycProfileId = randomUUID();

    await verificationHandler.handle(
      new VerificationPassedEvent(kycProfileId, userId, VerificationType.BVN),
    );

    const history = await auditLogRepository.findByUserId(userId);
    expect(history).toHaveLength(1);
    const props = history[0].toProps();
    expect(props.eventType).toBe(KycAuditEventType.VERIFICATION_ATTEMPT);
    expect(props.verificationType).toBe(VerificationType.BVN);
    expect(props.outcome).toBe(KycAuditOutcome.PASSED);
    expect(props.failureReason).toBeNull();
    expect(props.kycProfileId).toBe(kycProfileId);
  });

  it('records a failed verification attempt with its reason', async () => {
    const userId = randomUUID();
    createdUserIds.push(userId);
    const kycProfileId = randomUUID();

    await verificationHandler.handle(
      new VerificationFailedEvent(kycProfileId, userId, VerificationType.NIN, 'Name mismatch'),
    );

    const history = await auditLogRepository.findByUserId(userId);
    expect(history).toHaveLength(1);
    const props = history[0].toProps();
    expect(props.outcome).toBe(KycAuditOutcome.FAILED);
    expect(props.verificationType).toBe(VerificationType.NIN);
    expect(props.failureReason).toBe('Name mismatch');
  });

  it('records a tier change and correctly derives the previous tier', async () => {
    const userId = randomUUID();
    createdUserIds.push(userId);
    const kycProfileId = randomUUID();

    await tierChangeHandler.handle(new KycTierUpgradedEvent(kycProfileId, userId, KycTier.TIER_2));
    await tierChangeHandler.handle(new KycTierUpgradedEvent(kycProfileId, userId, KycTier.TIER_3));

    const history = await auditLogRepository.findByUserId(userId);
    expect(history).toHaveLength(2);

    const [first, second] = history.map((entry) => entry.toProps());
    expect(first.eventType).toBe(KycAuditEventType.TIER_CHANGE);
    expect(first.previousTier).toBe(KycTier.TIER_1);
    expect(first.newTier).toBe(KycTier.TIER_2);
    expect(second.previousTier).toBe(KycTier.TIER_2);
    expect(second.newTier).toBe(KycTier.TIER_3);
  });

  it('returns a user\'s full history, oldest first, via GetKycAuditHistoryQuery', async () => {
    const userId = randomUUID();
    createdUserIds.push(userId);
    const kycProfileId = randomUUID();

    await verificationHandler.handle(
      new VerificationFailedEvent(kycProfileId, userId, VerificationType.BVN, 'Name mismatch'),
    );
    await verificationHandler.handle(
      new VerificationPassedEvent(kycProfileId, userId, VerificationType.BVN),
    );
    await tierChangeHandler.handle(new KycTierUpgradedEvent(kycProfileId, userId, KycTier.TIER_2));

    const results = await historyHandler.execute(new GetKycAuditHistoryQuery(userId));
    expect(results).toHaveLength(3);
    expect(results[0].outcome).toBe(KycAuditOutcome.FAILED);
    expect(results[1].outcome).toBe(KycAuditOutcome.PASSED);
    expect(results[2].eventType).toBe(KycAuditEventType.TIER_CHANGE);
  });

  it('returns an empty history for a user with no audit entries', async () => {
    const results = await historyHandler.execute(new GetKycAuditHistoryQuery(randomUUID()));
    expect(results).toEqual([]);
  });
});

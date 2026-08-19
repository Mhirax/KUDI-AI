import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import flutterwaveConfig from '../../infrastructure/config/flutterwave.config';

// Domain ports
import { KYC_PROFILE_REPOSITORY } from './domain/repositories/kyc-profile.repository.interface';
import { KYC_TIER_LIMIT_REPOSITORY } from './domain/repositories/kyc-tier-limit.repository.interface';
import { KYC_AUDIT_LOG_REPOSITORY } from './domain/repositories/kyc-audit-log.repository.interface';
import { IDENTITY_VERIFICATION_PROVIDER } from './domain/services/identity-verification-provider.interface';

// Infrastructure adapters (this module)
import { PrismaKycProfileRepository } from './infrastructure/persistence/prisma-kyc-profile.repository';
import { PrismaKycTierLimitRepository } from './infrastructure/persistence/prisma-kyc-tier-limit.repository';
import { PrismaKycAuditLogRepository } from './infrastructure/persistence/prisma-kyc-audit-log.repository';
import { FlutterwaveIdentityVerificationProvider } from './infrastructure/services/flutterwave-identity-verification-provider.service';

// Flutterwave integration adapter
import { FLUTTERWAVE_VERIFICATION_CLIENT } from '../../integrations/payment-gateway/flutterwave/verification/flutterwave-verification.port';
import { FlutterwaveVerificationAdapter } from '../../integrations/payment-gateway/flutterwave/verification/flutterwave-verification.adapter';

// Application command/query/event handlers/services
import { SubmitBvnVerificationHandler } from './application/commands/submit-bvn-verification/submit-bvn-verification.handler';
import { SubmitNinVerificationHandler } from './application/commands/submit-nin-verification/submit-nin-verification.handler';
import { GetMyKycStatusHandler } from './application/queries/get-my-kyc-status/get-my-kyc-status.handler';
import { GetKycAuditHistoryHandler } from './application/queries/get-kyc-audit-history/get-kyc-audit-history.handler';
import { UserRegisteredHandler } from './application/event-handlers/user-registered.handler';
import { KycAuditRecorderService } from './application/services/kyc-audit-recorder.service';

// Presentation
import { KycController } from './presentation/controllers/kyc.controller';

// Cross-module dependency: IdentityModule exports USER_REPOSITORY,
// which SubmitBvnVerificationHandler/SubmitNinVerificationHandler
// consume via DI to look up the caller's registered name.
import { IdentityModule } from '../identity/identity.module';

const commandHandlers = [SubmitBvnVerificationHandler, SubmitNinVerificationHandler];
const queryHandlers = [GetMyKycStatusHandler, GetKycAuditHistoryHandler];
const eventHandlers = [UserRegisteredHandler];

/**
 * Compliance/KYC bounded-context module.
 *
 * Imports `IdentityModule` to consume its exported `USER_REPOSITORY`
 * token (name-matching against verification results) — the same
 * sanctioned cross-module pattern used by Transfers→Accounts. Unlike
 * Transfers' internal-transfer executor, this module has no
 * cross-aggregate atomicity requirement, so there is no equivalent
 * "documented exception" coupling here: every cross-module touchpoint
 * (Identity's `UserRegisteredEvent` in, this module's own
 * `KycTierUpgradedEvent` out to Accounts) goes through a published
 * port or event, nothing more.
 */
@Module({
  imports: [CqrsModule, ConfigModule.forFeature(flutterwaveConfig), HttpModule, IdentityModule],
  controllers: [KycController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    KycAuditRecorderService,
    { provide: KYC_PROFILE_REPOSITORY, useClass: PrismaKycProfileRepository },
    { provide: KYC_TIER_LIMIT_REPOSITORY, useClass: PrismaKycTierLimitRepository },
    { provide: KYC_AUDIT_LOG_REPOSITORY, useClass: PrismaKycAuditLogRepository },
    { provide: IDENTITY_VERIFICATION_PROVIDER, useClass: FlutterwaveIdentityVerificationProvider },
    { provide: FLUTTERWAVE_VERIFICATION_CLIENT, useClass: FlutterwaveVerificationAdapter },
  ],
  // KYC_TIER_LIMIT_REPOSITORY is exported so Transfers/Accounts can read
  // limits directly when Phase 1c/1d wire in enforcement.
  exports: [KYC_PROFILE_REPOSITORY, KYC_TIER_LIMIT_REPOSITORY],
})
export class ComplianceModule {}

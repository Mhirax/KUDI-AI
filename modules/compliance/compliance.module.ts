import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import flutterwaveConfig from '../../infrastructure/config/flutterwave.config';

// Domain ports
import { KYC_PROFILE_REPOSITORY } from './domain/repositories/kyc-profile.repository.interface';
import { IDENTITY_VERIFICATION_PROVIDER } from './domain/services/identity-verification-provider.interface';

// Infrastructure adapters (this module)
import { PrismaKycProfileRepository } from './infrastructure/persistence/prisma-kyc-profile.repository';
import { FlutterwaveIdentityVerificationProvider } from './infrastructure/services/flutterwave-identity-verification-provider.service';

// Flutterwave integration adapter
import { FLUTTERWAVE_VERIFICATION_CLIENT } from '../../integrations/payment-gateway/flutterwave/verification/flutterwave-verification.port';
import { FlutterwaveVerificationAdapter } from '../../integrations/payment-gateway/flutterwave/verification/flutterwave-verification.adapter';

// Application command/query/event handlers
import { SubmitBvnVerificationHandler } from './application/commands/submit-bvn-verification/submit-bvn-verification.handler';
import { SubmitNinVerificationHandler } from './application/commands/submit-nin-verification/submit-nin-verification.handler';
import { GetMyKycStatusHandler } from './application/queries/get-my-kyc-status/get-my-kyc-status.handler';
import { UserRegisteredHandler } from './application/event-handlers/user-registered.handler';

// Presentation
import { KycController } from './presentation/controllers/kyc.controller';

// Cross-module dependency: IdentityModule exports USER_REPOSITORY,
// which SubmitBvnVerificationHandler/SubmitNinVerificationHandler
// consume via DI to look up the caller's registered name.
import { IdentityModule } from '../identity/identity.module';

const commandHandlers = [SubmitBvnVerificationHandler, SubmitNinVerificationHandler];
const queryHandlers = [GetMyKycStatusHandler];
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
    { provide: KYC_PROFILE_REPOSITORY, useClass: PrismaKycProfileRepository },
    { provide: IDENTITY_VERIFICATION_PROVIDER, useClass: FlutterwaveIdentityVerificationProvider },
    { provide: FLUTTERWAVE_VERIFICATION_CLIENT, useClass: FlutterwaveVerificationAdapter },
  ],
  exports: [KYC_PROFILE_REPOSITORY],
})
export class ComplianceModule {}

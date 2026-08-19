import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';

import bankConfig from '../../infrastructure/config/bank.config';

// Domain ports
import { ACCOUNT_REPOSITORY } from './domain/repositories/account.repository.interface';
import { ACCOUNT_NUMBER_GENERATOR } from './domain/services/account-number-generator.interface';
import { MAX_BALANCE_GUARD } from './domain/services/max-balance-guard.interface';

// Infrastructure adapters
import { PrismaAccountRepository } from './infrastructure/persistence/prisma-account.repository';
import { NubanAccountNumberGenerator } from './infrastructure/services/nuban-account-number-generator.service';
import { MaxBalanceGuardService } from './infrastructure/services/max-balance-guard.service';

// Application command/query handlers
import { OpenAccountHandler } from './application/commands/open-account/open-account.handler';
import { CreditAccountHandler } from './application/commands/credit-account/credit-account.handler';
import { DebitAccountHandler } from './application/commands/debit-account/debit-account.handler';
import { FreezeAccountHandler } from './application/commands/freeze-account/freeze-account.handler';
import { UnfreezeAccountHandler } from './application/commands/unfreeze-account/unfreeze-account.handler';
import { CloseAccountHandler } from './application/commands/close-account/close-account.handler';
import { ActivateAccountHandler } from './application/commands/activate-account/activate-account.handler';
import { GetAccountByIdHandler } from './application/queries/get-account-by-id/get-account-by-id.handler';
import { ListMyAccountsHandler } from './application/queries/list-my-accounts/list-my-accounts.handler';
import { KycTierUpgradedHandler } from './application/event-handlers/kyc-tier-upgraded.handler';

// Presentation
import { AccountsController } from './presentation/controllers/accounts.controller';

// Cross-module dependency: ComplianceModule exports KYC_PROFILE_REPOSITORY
// and KYC_TIER_LIMIT_REPOSITORY, consumed by MaxBalanceGuardService
// (Phase 1d of modules/compliance/implementation.md). This is a real
// DI-token dependency (unlike KycTierUpgradedHandler's plain import of
// Compliance's event class below), so — unlike this module's previous
// isolation — ComplianceModule must be imported here too.
import { ComplianceModule } from '../compliance/compliance.module';

const commandHandlers = [
  OpenAccountHandler,
  ActivateAccountHandler,
  CreditAccountHandler,
  DebitAccountHandler,
  FreezeAccountHandler,
  UnfreezeAccountHandler,
  CloseAccountHandler,
];

const queryHandlers = [GetAccountByIdHandler, ListMyAccountsHandler];
const eventHandlers = [KycTierUpgradedHandler];

/**
 * Accounts & Wallets bounded-context module.
 *
 * Depends on `IdentityModule` only through the shared JWT payload
 * shape (`AccessTokenPayload`) consumed at the presentation layer —
 * there is no direct dependency on Identity's domain or application
 * internals, preserving bounded-context isolation. `KycTierUpgradedHandler`
 * depends on Compliance's *published event class* only (a plain import,
 * not a NestJS module import) — see that file's header comment.
 *
 * `ComplianceModule` *is* a real DI-token dependency, consumed by
 * `MaxBalanceGuardService` via `KYC_PROFILE_REPOSITORY`/
 * `KYC_TIER_LIMIT_REPOSITORY`. `MAX_BALANCE_GUARD` is exported so
 * Transfers' `PrismaInternalTransferExecutor` (which already imports
 * this module for `ACCOUNT_REPOSITORY`) can reuse the same check when
 * crediting a destination account, rather than duplicating it.
 *
 * `DatabaseModule` (global) already provides `PrismaService`; not
 * re-imported here.
 */
@Module({
  imports: [CqrsModule, ConfigModule.forFeature(bankConfig), ComplianceModule],
  controllers: [AccountsController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    { provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository },
    { provide: ACCOUNT_NUMBER_GENERATOR, useClass: NubanAccountNumberGenerator },
    { provide: MAX_BALANCE_GUARD, useClass: MaxBalanceGuardService },
  ],
  exports: [ACCOUNT_REPOSITORY, MAX_BALANCE_GUARD],
})
export class AccountsModule {}

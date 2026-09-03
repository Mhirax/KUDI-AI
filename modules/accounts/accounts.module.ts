import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';

import bankConfig from '../../infrastructure/config/bank.config';

// Domain ports
import { ACCOUNT_REPOSITORY } from './domain/repositories/account.repository.interface';
import { ACCOUNT_NUMBER_GENERATOR } from './domain/services/account-number-generator.interface';

// Infrastructure adapters
import { PrismaAccountRepository } from './infrastructure/persistence/prisma-account.repository';
import { SystemAccountService } from './application/services/system-account.service';
import { NubanAccountNumberGenerator } from './infrastructure/services/nuban-account-number-generator.service';

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
import { RegisterLedgerAccountHandler } from './application/event-handlers/register-ledger-account.handler';

// Presentation
import { AccountsController } from './presentation/controllers/accounts.controller';

// Ledger-engine gRPC client (shared platform infrastructure)
import { LedgerGrpcClientModule } from '../../infrastructure/grpc/ledger/ledger-grpc-client.module';

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
const eventHandlers = [KycTierUpgradedHandler, RegisterLedgerAccountHandler];

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
 * `LedgerGrpcClientModule` provides `RegisterLedgerAccountHandler`'s
 * connection to the Rust ledger-engine; it is a no-op when
 * `LEDGER_ENGINE_ENABLED` is unset (see that handler's header comment).
 *
 * `DatabaseModule` (global) already provides `PrismaService`; not
 * re-imported here.
 */
@Module({
  imports: [CqrsModule, ConfigModule.forFeature(bankConfig), LedgerGrpcClientModule],
  controllers: [AccountsController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    { provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository },
    { provide: ACCOUNT_NUMBER_GENERATOR, useClass: NubanAccountNumberGenerator },
    SystemAccountService,
  ],
  // SystemAccountService is exported so Transfers and Funding can post
  // the counterparty side of a fee or a deposit.
  exports: [ACCOUNT_REPOSITORY, SystemAccountService],
})
export class AccountsModule {}

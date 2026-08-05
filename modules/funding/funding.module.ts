import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import flutterwaveConfig from '../../infrastructure/config/flutterwave.config';

// Domain ports
import { DEPOSIT_REPOSITORY } from './domain/repositories/deposit.repository.interface';
import { VIRTUAL_ACCOUNT_REPOSITORY } from './domain/repositories/virtual-account.repository.interface';
import { FUNDING_PROVIDER } from './domain/services/funding-provider.interface';
import { DEPOSIT_SETTLEMENT_EXECUTOR } from './domain/services/deposit-settlement-executor.interface';

// Infrastructure adapters (this module)
import { PrismaDepositRepository } from './infrastructure/persistence/prisma-deposit.repository';
import { PrismaVirtualAccountRepository } from './infrastructure/persistence/prisma-virtual-account.repository';
import { FlutterwaveFundingProvider } from './infrastructure/services/flutterwave-funding-provider.service';
import { PrismaDepositSettlementExecutor } from './infrastructure/services/prisma-deposit-settlement-executor.service';

// Flutterwave integration adapter
import { FLUTTERWAVE_FUNDING_CLIENT } from '../../integrations/payment-gateway/flutterwave/funding/flutterwave-funding.port';
import { FlutterwaveFundingAdapter } from '../../integrations/payment-gateway/flutterwave/funding/flutterwave-funding.adapter';

// Application command/query handlers
import { CreateVirtualAccountHandler } from './application/commands/create-virtual-account/create-virtual-account.handler';
import { InitiateCheckoutDepositHandler } from './application/commands/initiate-checkout-deposit/initiate-checkout-deposit.handler';
import { ConfirmDepositHandler } from './application/commands/confirm-deposit/confirm-deposit.handler';
import { GetDepositByReferenceHandler } from './application/queries/get-deposit-by-reference/get-deposit-by-reference.handler';
import { ListMyDepositsHandler } from './application/queries/list-my-deposits/list-my-deposits.handler';
import { GetMyVirtualAccountsHandler } from './application/queries/get-my-virtual-accounts/get-my-virtual-accounts.handler';

// Presentation
import { FundingController } from './presentation/controllers/funding.controller';
import { FlutterwaveFundingWebhookController } from './presentation/controllers/flutterwave-funding-webhook.controller';

// Cross-module dependencies: Accounts' ACCOUNT_REPOSITORY (ownership
// checks + the settlement executor's documented coupling) and
// Identity's USER_REPOSITORY (customer email/name for provider calls).
import { AccountsModule } from '../accounts/accounts.module';
import { IdentityModule } from '../identity/identity.module';

const commandHandlers = [
  CreateVirtualAccountHandler,
  InitiateCheckoutDepositHandler,
  ConfirmDepositHandler,
];

const queryHandlers = [
  GetDepositByReferenceHandler,
  ListMyDepositsHandler,
  GetMyVirtualAccountsHandler,
];

/**
 * Funding bounded-context module — all money-in.
 *
 * Two channels: permanent virtual account numbers (inbound bank
 * transfers) and Flutterwave hosted checkout. Settlement is
 * exclusively webhook-driven and re-verified server-to-server; the
 * account credit itself runs through Accounts' own aggregate inside
 * the settlement executor's single transaction, so Accounts
 * invariants and the Ledger projection apply to every deposit
 * automatically.
 */
@Module({
  imports: [
    CqrsModule,
    ConfigModule.forFeature(flutterwaveConfig),
    HttpModule,
    AccountsModule,
    IdentityModule,
  ],
  controllers: [FundingController, FlutterwaveFundingWebhookController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    { provide: DEPOSIT_REPOSITORY, useClass: PrismaDepositRepository },
    { provide: VIRTUAL_ACCOUNT_REPOSITORY, useClass: PrismaVirtualAccountRepository },
    { provide: FUNDING_PROVIDER, useClass: FlutterwaveFundingProvider },
    { provide: DEPOSIT_SETTLEMENT_EXECUTOR, useClass: PrismaDepositSettlementExecutor },
    { provide: FLUTTERWAVE_FUNDING_CLIENT, useClass: FlutterwaveFundingAdapter },
  ],
  exports: [DEPOSIT_REPOSITORY],
})
export class FundingModule {}

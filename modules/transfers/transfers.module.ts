import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import flutterwaveConfig from '../../infrastructure/config/flutterwave.config';

// Domain ports
import { TRANSFER_REPOSITORY } from './domain/repositories/transfer.repository.interface';
import { FEE_CALCULATOR } from './domain/services/fee-calculator.interface';
import { EXTERNAL_PAYOUT_PROVIDER } from './domain/services/external-payout-provider.interface';
import { INTERNAL_TRANSFER_EXECUTOR } from './domain/services/internal-transfer-executor.interface';

// Infrastructure adapters (this module)
import { PrismaTransferRepository } from './infrastructure/persistence/prisma-transfer.repository';
import { FlatRateFeeCalculator } from './infrastructure/services/flat-rate-fee-calculator.service';
import { FlutterwavePayoutProvider } from './infrastructure/services/flutterwave-payout-provider.service';
import { PrismaInternalTransferExecutor } from './infrastructure/services/prisma-internal-transfer-executor.service';

// Flutterwave integration adapter (shared HTTP client for this module's use)
import { FLUTTERWAVE_TRANSFER_CLIENT } from '../../integrations/payment-gateway/flutterwave/transfers/flutterwave-transfer.port';
import { FlutterwaveTransferAdapter } from '../../integrations/payment-gateway/flutterwave/transfers/flutterwave-transfer.adapter';

// Application command/query handlers
import { InitiateInternalTransferHandler } from './application/commands/initiate-internal-transfer/initiate-internal-transfer.handler';
import { InitiateExternalTransferHandler } from './application/commands/initiate-external-transfer/initiate-external-transfer.handler';
import { ConfirmExternalTransferHandler } from './application/commands/confirm-external-transfer/confirm-external-transfer.handler';
import { GetTransferByReferenceHandler } from './application/queries/get-transfer-by-reference/get-transfer-by-reference.handler';
import { ListMyTransfersHandler } from './application/queries/list-my-transfers/list-my-transfers.handler';

// Presentation
import { TransfersController } from './presentation/controllers/transfers.controller';
import { FlutterwaveTransferWebhookController } from './presentation/controllers/flutterwave-transfer-webhook.controller';

// Cross-module dependency: AccountsModule exports ACCOUNT_REPOSITORY,
// which this module's handlers and executor consume via DI.
import { AccountsModule } from '../accounts/accounts.module';

const commandHandlers = [
  InitiateInternalTransferHandler,
  InitiateExternalTransferHandler,
  ConfirmExternalTransferHandler,
];

const queryHandlers = [GetTransferByReferenceHandler, ListMyTransfersHandler];

/**
 * Transfers bounded-context module.
 *
 * Imports `AccountsModule` to consume its exported `ACCOUNT_REPOSITORY`
 * token — the only sanctioned cross-module dependency, made through a
 * published port rather than Accounts' internals. The one deliberate
 * exception is `PrismaInternalTransferExecutor`, which imports
 * Accounts' `Account` entity and `AccountMapper` directly to achieve
 * cross-aggregate transactional atomicity; see that file's header
 * comment.
 */
@Module({
  imports: [
    CqrsModule,
    ConfigModule.forFeature(flutterwaveConfig),
    HttpModule,
    AccountsModule,
  ],
  controllers: [TransfersController, FlutterwaveTransferWebhookController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    { provide: TRANSFER_REPOSITORY, useClass: PrismaTransferRepository },
    { provide: FEE_CALCULATOR, useClass: FlatRateFeeCalculator },
    { provide: EXTERNAL_PAYOUT_PROVIDER, useClass: FlutterwavePayoutProvider },
    { provide: INTERNAL_TRANSFER_EXECUTOR, useClass: PrismaInternalTransferExecutor },
    { provide: FLUTTERWAVE_TRANSFER_CLIENT, useClass: FlutterwaveTransferAdapter },
  ],
  exports: [TRANSFER_REPOSITORY],
})
export class TransfersModule {}

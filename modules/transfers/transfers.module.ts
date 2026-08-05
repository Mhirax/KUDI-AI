import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import flutterwaveConfig from '../../infrastructure/config/flutterwave.config';
import ledgerEngineConfig from '../../infrastructure/config/ledger-engine.config';
import { PrismaService } from '../../infrastructure/database/prisma.service';

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
import { GrpcInternalTransferExecutor } from './infrastructure/services/grpc-internal-transfer-executor.service';

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
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../accounts/domain/repositories/account.repository.interface';
import { ITransferRepository } from './domain/repositories/transfer.repository.interface';

// Ledger-engine gRPC client (shared platform infrastructure)
import { LedgerGrpcClientModule } from '../../infrastructure/grpc/ledger/ledger-grpc-client.module';
import { LedgerEngineClient } from '../../infrastructure/grpc/ledger/ledger-engine.client';

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
 * published port rather than Accounts' internals.
 *
 * `INTERNAL_TRANSFER_EXECUTOR` is bound by a factory that switches
 * between two implementations based on `LEDGER_ENGINE_ENABLED`:
 *
 * - `false` (default): `PrismaInternalTransferExecutor`, which imports
 *   Accounts' `Account` entity and `AccountMapper` directly to achieve
 *   cross-aggregate atomicity via a single Prisma transaction — a
 *   deliberate, documented exception to the "depend only on exported
 *   ports" rule (see that file's header comment).
 * - `true`: `GrpcInternalTransferExecutor`, which delegates atomicity
 *   to the Rust ledger-engine over gRPC and depends only on Accounts'
 *   exported `ACCOUNT_REPOSITORY` port — no exception needed, because
 *   the ledger-engine now owns the atomicity guarantee instead of this
 *   module reaching into Accounts' internals to get it locally.
 *
 * This factory — not a code change elsewhere — is how the platform
 * migrates from one to the other.
 */
@Module({
  imports: [
    CqrsModule,
    ConfigModule.forFeature(flutterwaveConfig),
    ConfigModule.forFeature(ledgerEngineConfig),
    HttpModule,
    AccountsModule,
    LedgerGrpcClientModule,
  ],
  controllers: [TransfersController, FlutterwaveTransferWebhookController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    { provide: TRANSFER_REPOSITORY, useClass: PrismaTransferRepository },
    { provide: FEE_CALCULATOR, useClass: FlatRateFeeCalculator },
    { provide: EXTERNAL_PAYOUT_PROVIDER, useClass: FlutterwavePayoutProvider },
    {
      provide: INTERNAL_TRANSFER_EXECUTOR,
      inject: [
        ConfigService,
        ACCOUNT_REPOSITORY,
        TRANSFER_REPOSITORY,
        LedgerEngineClient,
        PrismaService,
      ],
      useFactory: (
        configService: ConfigService,
        accountRepository: IAccountRepository,
        transferRepository: ITransferRepository,
        ledgerEngineClient: LedgerEngineClient,
        prismaService: PrismaService,
      ) => {
        if (configService.get<boolean>('ledgerEngine.enabled', false)) {
          return new GrpcInternalTransferExecutor(
            accountRepository,
            transferRepository,
            ledgerEngineClient,
          );
        }
        return new PrismaInternalTransferExecutor(prismaService, transferRepository);
      },
    },
    { provide: FLUTTERWAVE_TRANSFER_CLIENT, useClass: FlutterwaveTransferAdapter },
  ],
  exports: [TRANSFER_REPOSITORY],
})
export class TransfersModule {}

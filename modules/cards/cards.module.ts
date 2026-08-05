import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import flutterwaveConfig from '../../infrastructure/config/flutterwave.config';

// Domain ports
import { CARD_REPOSITORY } from './domain/repositories/card.repository.interface';
import { CARD_ISSUER } from './domain/services/card-issuer.interface';

// Infrastructure adapters (this module)
import { PrismaCardRepository } from './infrastructure/persistence/prisma-card.repository';
import { FlutterwaveCardIssuerService } from './infrastructure/services/flutterwave-card-issuer.service';

// Flutterwave integration adapter
import { FLUTTERWAVE_VIRTUAL_CARDS_CLIENT } from '../../integrations/payment-gateway/flutterwave/virtual-cards/flutterwave-virtual-cards.port';
import { FlutterwaveVirtualCardsAdapter } from '../../integrations/payment-gateway/flutterwave/virtual-cards/flutterwave-virtual-cards.adapter';

// Application command/query handlers
import { CreateVirtualCardHandler } from './application/commands/create-virtual-card/create-virtual-card.handler';
import { RequestPhysicalCardHandler } from './application/commands/request-physical-card/request-physical-card.handler';
import { FreezeCardHandler } from './application/commands/freeze-card/freeze-card.handler';
import { UnfreezeCardHandler } from './application/commands/unfreeze-card/unfreeze-card.handler';
import { FundCardHandler } from './application/commands/fund-card/fund-card.handler';
import { TerminateCardHandler } from './application/commands/terminate-card/terminate-card.handler';
import { ListMyCardsHandler } from './application/queries/list-my-cards/list-my-cards.handler';
import { GetCardByIdHandler } from './application/queries/get-card-by-id/get-card-by-id.handler';

// Presentation
import { CardsController } from './presentation/controllers/cards.controller';

// Cross-module dependencies: Accounts (Credit/DebitAccountCommand,
// ACCOUNT_REPOSITORY), Compliance (KYC_PROFILE_REPOSITORY), and
// Identity (USER_REPOSITORY, for the card's billing name) — all
// consumed exclusively through their exported ports/commands, never
// their internals. Same integration pattern as SavingsModule/LoansModule.
import { AccountsModule } from '../accounts/accounts.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { IdentityModule } from '../identity/identity.module';

const commandHandlers = [
  CreateVirtualCardHandler,
  RequestPhysicalCardHandler,
  FreezeCardHandler,
  UnfreezeCardHandler,
  FundCardHandler,
  TerminateCardHandler,
];
const queryHandlers = [ListMyCardsHandler, GetCardByIdHandler];

/**
 * Cards bounded-context module — virtual and physical debit cards
 * linked to a platform Account. Virtual issuance and card-level
 * actions (fund/freeze/unfreeze/terminate) go through a real
 * Flutterwave Issuing integration (see
 * integrations/payment-gateway/flutterwave/virtual-cards); physical
 * issuance is recorded PENDING for offline fulfillment. Funding and
 * termination-sweep are two calls to Accounts' own
 * Credit/DebitAccountCommand, so Ledger projection and optimistic
 * concurrency on the money itself are inherited for free — see
 * README.md for the full design rationale.
 */
@Module({
  imports: [
    CqrsModule,
    ConfigModule.forFeature(flutterwaveConfig),
    HttpModule,
    AccountsModule,
    ComplianceModule,
    IdentityModule,
  ],
  controllers: [CardsController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    { provide: CARD_REPOSITORY, useClass: PrismaCardRepository },
    { provide: CARD_ISSUER, useClass: FlutterwaveCardIssuerService },
    { provide: FLUTTERWAVE_VIRTUAL_CARDS_CLIENT, useClass: FlutterwaveVirtualCardsAdapter },
  ],
  exports: [CARD_REPOSITORY],
})
export class CardsModule {}

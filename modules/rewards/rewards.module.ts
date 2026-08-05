import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Domain ports
import { REWARD_ACCOUNT_REPOSITORY } from './domain/repositories/reward-account.repository.interface';
import { REWARD_TRANSACTION_REPOSITORY } from './domain/repositories/reward-transaction.repository.interface';
import { REFERRAL_REDEMPTION_REPOSITORY } from './domain/repositories/referral-redemption.repository.interface';
import { REWARD_POINTS_CALCULATOR } from './domain/services/reward-points-calculator.interface';

// Infrastructure adapters
import { PrismaRewardAccountRepository } from './infrastructure/persistence/prisma-reward-account.repository';
import { PrismaRewardTransactionRepository } from './infrastructure/persistence/prisma-reward-transaction.repository';
import { PrismaReferralRedemptionRepository } from './infrastructure/persistence/prisma-referral-redemption.repository';
import { RateBasedRewardPointsCalculator } from './infrastructure/services/rate-based-reward-points-calculator.service';

// Application command/query/event handlers
import { EarnRewardPointsHandler } from './application/commands/earn-reward-points/earn-reward-points.handler';
import { RedeemRewardPointsHandler } from './application/commands/redeem-reward-points/redeem-reward-points.handler';
import { RedeemReferralCodeHandler } from './application/commands/redeem-referral-code/redeem-referral-code.handler';
import { GetMyRewardsHandler } from './application/queries/get-my-rewards/get-my-rewards.handler';
import { GetMyRewardHistoryHandler } from './application/queries/get-my-reward-history/get-my-reward-history.handler';
import { RewardsOnTransferCompletedHandler } from './application/event-handlers/transfer-completed.handler';
import { RewardsOnBillPaymentCompletedHandler } from './application/event-handlers/bill-payment-completed.handler';
import { RewardsOnDepositCompletedHandler } from './application/event-handlers/deposit-completed.handler';

// Presentation
import { RewardsController } from './presentation/controllers/rewards.controller';

// Cross-module dependencies: Accounts (CreditAccountCommand), Bills
// (InitiateBillPaymentCommand + BillCategory), Transfers
// (TRANSFER_REPOSITORY, for re-fetching a completed transfer's
// userId/amount since TransferCompletedEvent doesn't carry them),
// Funding — all consumed exclusively through exported ports/commands
// and published events, never internals.
import { AccountsModule } from '../accounts/accounts.module';
import { BillsModule } from '../bills/bills.module';
import { TransfersModule } from '../transfers/transfers.module';
import { FundingModule } from '../funding/funding.module';

const commandHandlers = [
  EarnRewardPointsHandler,
  RedeemRewardPointsHandler,
  RedeemReferralCodeHandler,
];
const queryHandlers = [GetMyRewardsHandler, GetMyRewardHistoryHandler];
const eventHandlers = [
  RewardsOnTransferCompletedHandler,
  RewardsOnBillPaymentCompletedHandler,
  RewardsOnDepositCompletedHandler,
];

/**
 * Rewards bounded-context module — points earned automatically from
 * completed money-moving activity elsewhere on the platform, redeemed
 * for cashback (via Accounts) or airtime/data (via Bills). See each
 * event-handlers/*.ts file for exactly which upstream event triggers
 * earning, and RedeemRewardPointsHandler for how redemption reuses
 * real money-movement paths instead of a bespoke one.
 */
@Module({
  imports: [CqrsModule, AccountsModule, BillsModule, TransfersModule, FundingModule],
  controllers: [RewardsController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    { provide: REWARD_ACCOUNT_REPOSITORY, useClass: PrismaRewardAccountRepository },
    { provide: REWARD_TRANSACTION_REPOSITORY, useClass: PrismaRewardTransactionRepository },
    { provide: REFERRAL_REDEMPTION_REPOSITORY, useClass: PrismaReferralRedemptionRepository },
    { provide: REWARD_POINTS_CALCULATOR, useClass: RateBasedRewardPointsCalculator },
  ],
  exports: [REWARD_ACCOUNT_REPOSITORY],
})
export class RewardsModule {}

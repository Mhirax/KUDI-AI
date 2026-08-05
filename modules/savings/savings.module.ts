import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Domain ports
import { SAVINGS_GOAL_REPOSITORY } from './domain/repositories/savings-goal.repository.interface';

// Infrastructure adapters
import { PrismaSavingsGoalRepository } from './infrastructure/persistence/prisma-savings-goal.repository';

// Application command/query handlers
import { CreateSavingsGoalHandler } from './application/commands/create-savings-goal/create-savings-goal.handler';
import { DepositToSavingsHandler } from './application/commands/deposit-to-savings/deposit-to-savings.handler';
import { WithdrawFromSavingsHandler } from './application/commands/withdraw-from-savings/withdraw-from-savings.handler';
import { CloseSavingsGoalHandler } from './application/commands/close-savings-goal/close-savings-goal.handler';
import { ListMySavingsGoalsHandler } from './application/queries/list-my-savings-goals/list-my-savings-goals.handler';
import { GetSavingsGoalByIdHandler } from './application/queries/get-savings-goal-by-id/get-savings-goal-by-id.handler';

// Presentation
import { SavingsController } from './presentation/controllers/savings.controller';

// Cross-module dependencies: Accounts (OpenAccountCommand,
// ActivateAccountCommand, Credit/DebitAccountCommand, ACCOUNT_REPOSITORY)
// and Compliance (KYC_PROFILE_REPOSITORY) — both consumed exclusively
// through their exported ports/commands, never their internals.
import { AccountsModule } from '../accounts/accounts.module';
import { ComplianceModule } from '../compliance/compliance.module';

const commandHandlers = [
  CreateSavingsGoalHandler,
  DepositToSavingsHandler,
  WithdrawFromSavingsHandler,
  CloseSavingsGoalHandler,
];
const queryHandlers = [ListMySavingsGoalsHandler, GetSavingsGoalByIdHandler];

/**
 * Savings bounded-context module — goal-based savings on top of the
 * platform's existing Account primitive (AccountType.SAVINGS). No new
 * money-movement machinery: every deposit/withdrawal is two calls to
 * Accounts' own Credit/DebitAccountCommand, so Ledger projection and
 * optimistic concurrency on the money itself are inherited for free
 * (see CreateSavingsGoalHandler's header comment).
 */
@Module({
  imports: [CqrsModule, AccountsModule, ComplianceModule],
  controllers: [SavingsController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    { provide: SAVINGS_GOAL_REPOSITORY, useClass: PrismaSavingsGoalRepository },
  ],
  exports: [SAVINGS_GOAL_REPOSITORY],
})
export class SavingsModule {}

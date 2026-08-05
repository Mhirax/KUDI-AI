import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Domain ports
import { LOAN_REPOSITORY } from './domain/repositories/loan.repository.interface';
import { LOAN_ELIGIBILITY_SERVICE } from './domain/services/loan-eligibility.interface';
import { LOAN_FEE_CALCULATOR } from './domain/services/loan-fee-calculator.interface';

// Infrastructure adapters
import { PrismaLoanRepository } from './infrastructure/persistence/prisma-loan.repository';
import { RulesBasedLoanEligibilityService } from './infrastructure/services/rules-based-loan-eligibility.service';
import { FlatFeeLoanCalculator } from './infrastructure/services/flat-fee-loan-calculator.service';

// Application command/query handlers
import { ApplyForLoanHandler } from './application/commands/apply-for-loan/apply-for-loan.handler';
import { ApproveLoanHandler } from './application/commands/approve-loan/approve-loan.handler';
import { DisburseLoanHandler } from './application/commands/disburse-loan/disburse-loan.handler';
import { RepayLoanHandler } from './application/commands/repay-loan/repay-loan.handler';
import { ListLoansHandler } from './application/queries/list-loans/list-loans.handler';
import { GetLoanByIdHandler } from './application/queries/get-loan-by-id/get-loan-by-id.handler';

// Presentation
import { LoansController } from './presentation/controllers/loans.controller';

// Cross-module dependencies: Accounts (Credit/DebitAccountCommand,
// ACCOUNT_REPOSITORY) and Compliance (KYC_PROFILE_REPOSITORY) — both
// consumed exclusively through their exported ports/commands, never
// their internals. Same integration pattern as SavingsModule.
import { AccountsModule } from '../accounts/accounts.module';
import { ComplianceModule } from '../compliance/compliance.module';

const commandHandlers = [
  ApplyForLoanHandler,
  ApproveLoanHandler,
  DisburseLoanHandler,
  RepayLoanHandler,
];
const queryHandlers = [ListLoansHandler, GetLoanByIdHandler];

/**
 * Loans bounded-context module — internal lending against the
 * platform's own ledger. Disbursement and repayment are two calls to
 * Accounts' own Credit/DebitAccountCommand, so Ledger projection and
 * optimistic concurrency on the money itself are inherited for free —
 * this module only owns the loan lifecycle state machine
 * (PENDING_REVIEW → APPROVED → DISBURSED → REPAYING → REPAID, or
 * → REJECTED). See README.md for the eligibility/fee model and what a
 * later phase would add (external credit bureau, tiered pricing,
 * auto-approval, DEFAULTED sweep job).
 */
@Module({
  imports: [CqrsModule, AccountsModule, ComplianceModule],
  controllers: [LoansController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    { provide: LOAN_REPOSITORY, useClass: PrismaLoanRepository },
    { provide: LOAN_ELIGIBILITY_SERVICE, useClass: RulesBasedLoanEligibilityService },
    { provide: LOAN_FEE_CALCULATOR, useClass: FlatFeeLoanCalculator },
  ],
  exports: [LOAN_REPOSITORY],
})
export class LoansModule {}

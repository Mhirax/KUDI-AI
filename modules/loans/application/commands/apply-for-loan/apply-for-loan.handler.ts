import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ApplyForLoanCommand } from './apply-for-loan.command';
import {
  LOAN_REPOSITORY,
  ILoanRepository,
} from '../../../domain/repositories/loan.repository.interface';
import {
  LOAN_ELIGIBILITY_SERVICE,
  ILoanEligibilityService,
} from '../../../domain/services/loan-eligibility.interface';
import {
  LOAN_FEE_CALCULATOR,
  ILoanFeeCalculator,
} from '../../../domain/services/loan-fee-calculator.interface';
import { Loan } from '../../../domain/entities/loan.entity';
import { LoanNotEligibleException } from '../../../domain/exceptions/loan-not-eligible.exception';
import { LoanAmountExceedsLimitException } from '../../../domain/exceptions/loan-amount-exceeds-limit.exception';
import { LoanResponseDto } from '../../dto/loan-response.dto';
import { Money } from '../../../../../shared/value-objects/money.vo';

// Cross-module dependency on Accounts' *port* — ownership check only;
// disbursement/repayment (real money movement) happen in their own
// handlers, not here.
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../../accounts/domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../../accounts/domain/exceptions/account-not-found.exception';

/**
 * Use case: apply for a loan. No money moves here — this only records
 * the application as PENDING_REVIEW after checking eligibility
 * (KYC tier + account status, see RulesBasedLoanEligibilityService)
 * and computing the flat fee for the requested principal/tenor.
 * Approval and disbursement are separate, deliberately staff-gated
 * steps (see ApproveLoanHandler/DisburseLoanHandler).
 */
@Injectable()
@CommandHandler(ApplyForLoanCommand)
export class ApplyForLoanHandler implements ICommandHandler<ApplyForLoanCommand, LoanResponseDto> {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loanRepository: ILoanRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(LOAN_ELIGIBILITY_SERVICE) private readonly eligibilityService: ILoanEligibilityService,
    @Inject(LOAN_FEE_CALCULATOR) private readonly feeCalculator: ILoanFeeCalculator,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ApplyForLoanCommand): Promise<LoanResponseDto> {
    const account = await this.accountRepository.findById(command.accountId);
    if (!account) {
      throw new AccountNotFoundException(command.accountId);
    }
    if (account.userId !== command.userId) {
      throw new ForbiddenException('You may only apply for a loan against your own account');
    }

    const eligibility = await this.eligibilityService.assess(command.userId, command.accountId);
    if (!eligibility.isEligible) {
      throw new LoanNotEligibleException(eligibility.reason ?? 'not eligible');
    }

    const principal = Money.fromDecimalString(command.amount, account.currency);
    if (principal.getMinorUnits() > eligibility.maxPrincipalMinorUnits) {
      throw new LoanAmountExceedsLimitException(
        principal.toMajorUnitsString(),
        Money.fromMinorUnits(
          eligibility.maxPrincipalMinorUnits,
          account.currency,
        ).toMajorUnitsString(),
      );
    }

    const fee = await this.feeCalculator.calculate(principal, command.tenorDays);

    const loan = Loan.apply({
      userId: command.userId,
      accountId: command.accountId,
      principal,
      fee,
      tenorDays: command.tenorDays,
    });

    await this.loanRepository.save(loan);
    loan.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return LoanResponseDto.fromDomain(loan);
  }
}

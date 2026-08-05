import { Inject, Injectable } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { DisburseLoanCommand } from './disburse-loan.command';
import {
  LOAN_REPOSITORY,
  ILoanRepository,
} from '../../../domain/repositories/loan.repository.interface';
import { LoanNotFoundException } from '../../../domain/exceptions/loan-not-found.exception';
import { LoanResponseDto } from '../../dto/loan-response.dto';

// Cross-module dependency on Accounts' own CreditAccountCommand — the
// actual money movement, reused rather than reimplemented.
import { CreditAccountCommand } from '../../../../accounts/application/commands/credit-account/credit-account.command';

/**
 * Use case: disburse an APPROVED loan's principal into the borrower's
 * wallet. Real money movement runs through Accounts' own
 * CreditAccountCommand, so the Ledger records the disbursement exactly
 * like any other credit — see this module's README for why Loans never
 * touches Account balances directly.
 */
@Injectable()
@CommandHandler(DisburseLoanCommand)
export class DisburseLoanHandler implements ICommandHandler<DisburseLoanCommand, LoanResponseDto> {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loanRepository: ILoanRepository,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DisburseLoanCommand): Promise<LoanResponseDto> {
    const loan = await this.loanRepository.findById(command.loanId);
    if (!loan) {
      throw new LoanNotFoundException(command.loanId);
    }

    loan.disburse();
    await this.loanRepository.save(loan);

    await this.commandBus.execute(
      new CreditAccountCommand(
        loan.accountId,
        loan.principal.toMajorUnitsString(),
        loan.currency,
        loan.reference,
      ),
    );

    loan.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return LoanResponseDto.fromDomain(loan);
  }
}

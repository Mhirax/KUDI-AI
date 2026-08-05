import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { RepayLoanCommand } from './repay-loan.command';
import {
  LOAN_REPOSITORY,
  ILoanRepository,
} from '../../../domain/repositories/loan.repository.interface';
import { LoanNotFoundException } from '../../../domain/exceptions/loan-not-found.exception';
import { LoanResponseDto } from '../../dto/loan-response.dto';
import { Money } from '../../../../../shared/value-objects/money.vo';

// Cross-module dependency on Accounts' own DebitAccountCommand — the
// actual money movement, reused rather than reimplemented.
import { DebitAccountCommand } from '../../../../accounts/application/commands/debit-account/debit-account.command';

/**
 * Use case: repay (fully or partially) a DISBURSED/REPAYING loan.
 * Real money movement runs through Accounts' own DebitAccountCommand
 * first — Account.debit() enforces sufficient-funds, so a repayment
 * attempt against an under-funded wallet fails there, before the loan
 * itself is ever touched.
 */
@Injectable()
@CommandHandler(RepayLoanCommand)
export class RepayLoanHandler implements ICommandHandler<RepayLoanCommand, LoanResponseDto> {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loanRepository: ILoanRepository,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RepayLoanCommand): Promise<LoanResponseDto> {
    const loan = await this.loanRepository.findById(command.loanId);
    if (!loan) {
      throw new LoanNotFoundException(command.loanId);
    }
    if (loan.userId !== command.userId) {
      throw new ForbiddenException('You may only repay your own loan');
    }

    const reference = `${loan.reference}-REPAY-${Date.now()}`;
    await this.commandBus.execute(
      new DebitAccountCommand(loan.accountId, command.amount, loan.currency, reference),
    );

    const amount = Money.fromDecimalString(command.amount, loan.currency);
    loan.recordRepayment(amount);
    await this.loanRepository.save(loan);
    loan.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return LoanResponseDto.fromDomain(loan);
  }
}

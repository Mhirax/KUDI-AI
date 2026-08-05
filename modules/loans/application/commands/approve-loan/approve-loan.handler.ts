import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ApproveLoanCommand } from './approve-loan.command';
import {
  LOAN_REPOSITORY,
  ILoanRepository,
} from '../../../domain/repositories/loan.repository.interface';
import { LoanNotFoundException } from '../../../domain/exceptions/loan-not-found.exception';
import { LoanResponseDto } from '../../dto/loan-response.dto';

/**
 * Use case: approve or reject a PENDING_REVIEW loan. Staff-only (see
 * @Roles on LoansController) — no money moves here either;
 * disbursement is a deliberately separate step (DisburseLoanHandler)
 * so "approved" and "money actually sent" can never be conflated in
 * an audit trail.
 */
@Injectable()
@CommandHandler(ApproveLoanCommand)
export class ApproveLoanHandler implements ICommandHandler<ApproveLoanCommand, LoanResponseDto> {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loanRepository: ILoanRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ApproveLoanCommand): Promise<LoanResponseDto> {
    const loan = await this.loanRepository.findById(command.loanId);
    if (!loan) {
      throw new LoanNotFoundException(command.loanId);
    }

    if (command.approve) {
      loan.approve(command.reviewerUserId);
    } else {
      loan.reject(command.reason ?? 'Rejected by reviewer');
    }

    await this.loanRepository.save(loan);
    loan.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return LoanResponseDto.fromDomain(loan);
  }
}

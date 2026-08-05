import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLoanByIdQuery } from './get-loan-by-id.query';
import {
  LOAN_REPOSITORY,
  ILoanRepository,
} from '../../../domain/repositories/loan.repository.interface';
import { LoanNotFoundException } from '../../../domain/exceptions/loan-not-found.exception';
import { LoanResponseDto } from '../../dto/loan-response.dto';

@Injectable()
@QueryHandler(GetLoanByIdQuery)
export class GetLoanByIdHandler implements IQueryHandler<GetLoanByIdQuery, LoanResponseDto> {
  constructor(@Inject(LOAN_REPOSITORY) private readonly loanRepository: ILoanRepository) {}

  async execute(query: GetLoanByIdQuery): Promise<LoanResponseDto> {
    const loan = await this.loanRepository.findById(query.loanId);
    if (!loan) {
      throw new LoanNotFoundException(query.loanId);
    }
    if (!query.isAdmin && loan.userId !== query.requesterUserId) {
      throw new ForbiddenException('You may only view your own loan');
    }
    return LoanResponseDto.fromDomain(loan);
  }
}

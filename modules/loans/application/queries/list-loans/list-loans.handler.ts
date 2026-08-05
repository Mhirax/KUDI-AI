import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListLoansQuery } from './list-loans.query';
import {
  LOAN_REPOSITORY,
  ILoanRepository,
} from '../../../domain/repositories/loan.repository.interface';
import { LoanResponseDto } from '../../dto/loan-response.dto';
import { PaginatedResponseDto } from '../../../../../shared/dto/paginated-response.dto';

/**
 * Admins/support see every loan (review queue); customers only ever
 * see their own — mirrors the role-aware listing pattern already used
 * elsewhere (see AccountsController's admin-only routes for the
 * precedent on gating by role rather than building two endpoints).
 */
@Injectable()
@QueryHandler(ListLoansQuery)
export class ListLoansHandler implements IQueryHandler<
  ListLoansQuery,
  PaginatedResponseDto<LoanResponseDto>
> {
  constructor(@Inject(LOAN_REPOSITORY) private readonly loanRepository: ILoanRepository) {}

  async execute(query: ListLoansQuery): Promise<PaginatedResponseDto<LoanResponseDto>> {
    const { loans, total } = query.isAdmin
      ? await this.loanRepository.findPageAll({ page: query.page, limit: query.pageSize })
      : await this.loanRepository.findPageByUserId({
          userId: query.requesterUserId,
          page: query.page,
          limit: query.pageSize,
        });

    return {
      data: loans.map((loan) => LoanResponseDto.fromDomain(loan)),
      meta: {
        total,
        page: query.page,
        limit: query.pageSize,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }
}

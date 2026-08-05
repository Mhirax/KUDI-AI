import { Loan } from '../entities/loan.entity';

export interface LoanPage {
  loans: Loan[];
  total: number;
}

export interface ILoanRepository {
  findById(id: string): Promise<Loan | null>;
  findByReference(reference: string): Promise<Loan | null>;
  findPageByUserId(params: { userId: string; page: number; limit: number }): Promise<LoanPage>;
  findPageAll(params: { page: number; limit: number }): Promise<LoanPage>;
  save(loan: Loan): Promise<void>;
}

export const LOAN_REPOSITORY = Symbol('LOAN_REPOSITORY');

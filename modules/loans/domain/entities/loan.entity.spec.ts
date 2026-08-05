import { Loan } from './loan.entity';
import { LoanStatus } from '../enums/loan-status.enum';
import { InvalidLoanStateException } from '../exceptions/invalid-loan-state.exception';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

function applyForLoan(): Loan {
  return Loan.apply({
    userId: 'user-1',
    accountId: 'account-1',
    principal: Money.fromDecimalString('10000.00', Currency.NGN),
    fee: Money.fromDecimalString('1000.00', Currency.NGN),
    tenorDays: 30,
  });
}

describe('Loan aggregate', () => {
  it('applies PENDING_REVIEW with a KUDI-LOAN reference and emits LoanAppliedEvent', () => {
    const loan = applyForLoan();

    expect(loan.status).toBe(LoanStatus.PENDING_REVIEW);
    expect(loan.reference).toMatch(/^KUDI-LOAN-[A-F0-9]{12}$/);
    expect(loan.pullDomainEvents()[0].eventName).toBe('loans.loan.applied');
  });

  it('computes totalRepayable as principal + fee', () => {
    const loan = applyForLoan();
    expect(loan.totalRepayable().toMajorUnitsString()).toBe('11000.00');
    expect(loan.outstandingBalance().toMajorUnitsString()).toBe('11000.00');
  });

  it('approves from PENDING_REVIEW and records the reviewer', () => {
    const loan = applyForLoan();
    loan.pullDomainEvents();

    loan.approve('admin-1');

    expect(loan.status).toBe(LoanStatus.APPROVED);
    expect(loan.approvedByUserId).toBe('admin-1');
    expect(loan.pullDomainEvents()[0].eventName).toBe('loans.loan.approved');
  });

  it('rejects from PENDING_REVIEW with a reason', () => {
    const loan = applyForLoan();
    loan.pullDomainEvents();

    loan.reject('insufficient income evidence');

    expect(loan.status).toBe(LoanStatus.REJECTED);
    expect(loan.rejectionReason).toBe('insufficient income evidence');
    expect(loan.pullDomainEvents()[0].eventName).toBe('loans.loan.rejected');
  });

  it('disburses an approved loan and sets a due date', () => {
    const loan = applyForLoan();
    loan.approve('admin-1');
    loan.pullDomainEvents();

    loan.disburse();

    expect(loan.status).toBe(LoanStatus.DISBURSED);
    expect(loan.dueDate).not.toBeNull();
    expect(loan.pullDomainEvents()[0].eventName).toBe('loans.loan.disbursed');
  });

  it('refuses to disburse a loan that was never approved', () => {
    const loan = applyForLoan();
    expect(() => loan.disburse()).toThrow(InvalidLoanStateException);
  });

  it('records a partial repayment, staying REPAYING', () => {
    const loan = applyForLoan();
    loan.approve('admin-1');
    loan.disburse();
    loan.pullDomainEvents();

    loan.recordRepayment(Money.fromDecimalString('5000.00', Currency.NGN));

    expect(loan.status).toBe(LoanStatus.REPAYING);
    expect(loan.outstandingBalance().toMajorUnitsString()).toBe('6000.00');
    expect(loan.pullDomainEvents()[0].eventName).toBe('loans.loan.repayment-recorded');
  });

  it('marks REPAID and emits LoanFullyRepaidEvent once amountRepaid covers principal + fee', () => {
    const loan = applyForLoan();
    loan.approve('admin-1');
    loan.disburse();
    loan.pullDomainEvents();

    loan.recordRepayment(Money.fromDecimalString('11000.00', Currency.NGN));

    expect(loan.status).toBe(LoanStatus.REPAID);
    expect(loan.outstandingBalance().toMajorUnitsString()).toBe('0.00');
    const events = loan.pullDomainEvents();
    expect(events.map((e) => e.eventName)).toEqual([
      'loans.loan.repayment-recorded',
      'loans.loan.fully-repaid',
    ]);
  });

  it('rejects repayment against a loan that was never disbursed', () => {
    const loan = applyForLoan();
    expect(() => loan.recordRepayment(Money.fromDecimalString('100.00', Currency.NGN))).toThrow(
      InvalidLoanStateException,
    );
  });
});

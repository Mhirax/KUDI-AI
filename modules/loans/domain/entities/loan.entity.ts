import { randomUUID, randomBytes } from 'crypto';
import { DomainEvent } from '../../../../shared/events/domain-event.base';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';
import { LoanStatus } from '../enums/loan-status.enum';
import { InvalidLoanStateException } from '../exceptions/invalid-loan-state.exception';
import { LoanAppliedEvent } from '../events/loan-applied.event';
import { LoanApprovedEvent } from '../events/loan-approved.event';
import { LoanRejectedEvent } from '../events/loan-rejected.event';
import { LoanDisbursedEvent } from '../events/loan-disbursed.event';
import { LoanRepaymentRecordedEvent } from '../events/loan-repayment-recorded.event';
import { LoanFullyRepaidEvent } from '../events/loan-fully-repaid.event';

export interface LoanProps {
  id: string;
  reference: string;
  userId: string;
  accountId: string;
  principal: Money;
  fee: Money;
  amountRepaid: Money;
  currency: Currency;
  tenorDays: number;
  status: LoanStatus;
  dueDate: Date | null;
  approvedByUserId: string | null;
  rejectionReason: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Loan Aggregate Root — purely internal lending against the
 * platform's own ledger (see module README: no external credit-bureau
 * or lending-provider integration in this phase).
 *
 * State machine:
 *   PENDING_REVIEW → APPROVED → DISBURSED → REPAYING → REPAID
 *   PENDING_REVIEW → REJECTED
 *
 * Disbursement and repayment themselves move real money through
 * Accounts' own Credit/DebitAccountCommand (see
 * DisburseLoanHandler/RepayLoanHandler) — this aggregate only tracks
 * the loan's own state and repayment progress, exactly the same
 * division of responsibility BillPayment/Transfer already use for
 * their sagas.
 */
export class Loan {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private props: LoanProps) {}

  static apply(params: {
    userId: string;
    accountId: string;
    principal: Money;
    fee: Money;
    tenorDays: number;
  }): Loan {
    const now = new Date();
    const loan = new Loan({
      id: randomUUID(),
      reference: `KUDI-LOAN-${randomBytes(6).toString('hex').toUpperCase()}`,
      userId: params.userId,
      accountId: params.accountId,
      principal: params.principal,
      fee: params.fee,
      amountRepaid: Money.zero(params.principal.getCurrency()),
      currency: params.principal.getCurrency(),
      tenorDays: params.tenorDays,
      status: LoanStatus.PENDING_REVIEW,
      dueDate: null,
      approvedByUserId: null,
      rejectionReason: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    loan.addDomainEvent(
      new LoanAppliedEvent(
        loan.props.id,
        loan.props.userId,
        loan.props.principal.getMinorUnits().toString(),
        loan.props.currency,
      ),
    );

    return loan;
  }

  static reconstitute(props: LoanProps): Loan {
    return new Loan(props);
  }

  approve(approvedByUserId: string): void {
    this.assertStatus('approve', [LoanStatus.PENDING_REVIEW]);
    this.props.status = LoanStatus.APPROVED;
    this.props.approvedByUserId = approvedByUserId;
    this.touch();
    this.addDomainEvent(new LoanApprovedEvent(this.props.id, this.props.userId, approvedByUserId));
  }

  reject(reason: string): void {
    this.assertStatus('reject', [LoanStatus.PENDING_REVIEW]);
    this.props.status = LoanStatus.REJECTED;
    this.props.rejectionReason = reason;
    this.touch();
    this.addDomainEvent(new LoanRejectedEvent(this.props.id, this.props.userId, reason));
  }

  disburse(): void {
    this.assertStatus('disburse', [LoanStatus.APPROVED]);
    this.props.status = LoanStatus.DISBURSED;
    const due = new Date();
    due.setDate(due.getDate() + this.props.tenorDays);
    this.props.dueDate = due;
    this.touch();
    this.addDomainEvent(
      new LoanDisbursedEvent(
        this.props.id,
        this.props.userId,
        this.props.accountId,
        this.props.principal.getMinorUnits().toString(),
        this.props.currency,
      ),
    );
  }

  recordRepayment(amount: Money): void {
    this.assertStatus('repay', [LoanStatus.DISBURSED, LoanStatus.REPAYING]);
    this.props.amountRepaid = this.props.amountRepaid.add(amount);
    const remaining = this.outstandingBalance();
    this.touch();

    if (this.props.amountRepaid.isGreaterThanOrEqualTo(this.totalRepayable())) {
      this.props.status = LoanStatus.REPAID;
      this.addDomainEvent(
        new LoanRepaymentRecordedEvent(
          this.props.id,
          this.props.userId,
          amount.getMinorUnits().toString(),
          this.props.currency,
          '0',
        ),
      );
      this.addDomainEvent(new LoanFullyRepaidEvent(this.props.id, this.props.userId));
    } else {
      this.props.status = LoanStatus.REPAYING;
      this.addDomainEvent(
        new LoanRepaymentRecordedEvent(
          this.props.id,
          this.props.userId,
          amount.getMinorUnits().toString(),
          this.props.currency,
          remaining.getMinorUnits().toString(),
        ),
      );
    }
  }

  totalRepayable(): Money {
    return this.props.principal.add(this.props.fee);
  }

  outstandingBalance(): Money {
    const total = this.totalRepayable();
    return this.props.amountRepaid.isGreaterThanOrEqualTo(total)
      ? Money.zero(this.props.currency)
      : total.subtract(this.props.amountRepaid);
  }

  private assertStatus(attempted: string, allowed: LoanStatus[]): void {
    if (!allowed.includes(this.props.status)) {
      throw new InvalidLoanStateException(this.props.id, attempted, this.props.status);
    }
  }

  private touch(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }

  private addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  get id(): string {
    return this.props.id;
  }
  get reference(): string {
    return this.props.reference;
  }
  get userId(): string {
    return this.props.userId;
  }
  get accountId(): string {
    return this.props.accountId;
  }
  get principal(): Money {
    return this.props.principal;
  }
  get fee(): Money {
    return this.props.fee;
  }
  get amountRepaid(): Money {
    return this.props.amountRepaid;
  }
  get currency(): Currency {
    return this.props.currency;
  }
  get tenorDays(): number {
    return this.props.tenorDays;
  }
  get status(): LoanStatus {
    return this.props.status;
  }
  get dueDate(): Date | null {
    return this.props.dueDate;
  }
  get approvedByUserId(): string | null {
    return this.props.approvedByUserId;
  }
  get rejectionReason(): string | null {
    return this.props.rejectionReason;
  }
  get version(): number {
    return this.props.version;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toProps(): Readonly<LoanProps> {
    return { ...this.props };
  }
}

import { Loan } from '../../domain/entities/loan.entity';

export class LoanResponseDto {
  id: string;
  reference: string;
  userId: string;
  accountId: string;
  /** Major-unit decimal strings — bigint minor units are never serialized directly. */
  principal: string;
  fee: string;
  totalRepayable: string;
  amountRepaid: string;
  outstandingBalance: string;
  currency: string;
  tenorDays: number;
  status: string;
  dueDate: string | null;
  rejectionReason: string | null;
  createdAt: string;

  static fromDomain(loan: Loan): LoanResponseDto {
    const props = loan.toProps();
    return {
      id: props.id,
      reference: props.reference,
      userId: props.userId,
      accountId: props.accountId,
      principal: props.principal.toMajorUnitsString(),
      fee: props.fee.toMajorUnitsString(),
      totalRepayable: loan.totalRepayable().toMajorUnitsString(),
      amountRepaid: props.amountRepaid.toMajorUnitsString(),
      outstandingBalance: loan.outstandingBalance().toMajorUnitsString(),
      currency: props.currency,
      tenorDays: props.tenorDays,
      status: props.status,
      dueDate: props.dueDate ? props.dueDate.toISOString() : null,
      rejectionReason: props.rejectionReason,
      createdAt: props.createdAt.toISOString(),
    };
  }
}

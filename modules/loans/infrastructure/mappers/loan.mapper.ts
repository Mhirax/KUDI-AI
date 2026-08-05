import { Loan as PrismaLoan } from '@prisma/client';
import { Loan } from '../../domain/entities/loan.entity';
import { LoanStatus } from '../../domain/enums/loan-status.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

export class LoanMapper {
  static toDomain(record: PrismaLoan): Loan {
    const currency = record.currency as Currency;
    return Loan.reconstitute({
      id: record.id,
      reference: record.reference,
      userId: record.userId,
      accountId: record.accountId,
      principal: Money.fromMinorUnits(record.principalMinorUnits, currency),
      fee: Money.fromMinorUnits(record.feeMinorUnits, currency),
      amountRepaid: Money.fromMinorUnits(record.amountRepaidMinorUnits, currency),
      currency,
      tenorDays: record.tenorDays,
      status: record.status as LoanStatus,
      dueDate: record.dueDate,
      approvedByUserId: record.approvedByUserId,
      rejectionReason: record.rejectionReason,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(loan: Loan): PrismaLoan {
    const props = loan.toProps();
    return {
      id: props.id,
      reference: props.reference,
      userId: props.userId,
      accountId: props.accountId,
      principalMinorUnits: props.principal.getMinorUnits(),
      feeMinorUnits: props.fee.getMinorUnits(),
      totalRepayableMinorUnits: loan.totalRepayable().getMinorUnits(),
      amountRepaidMinorUnits: props.amountRepaid.getMinorUnits(),
      currency: props.currency,
      tenorDays: props.tenorDays,
      status: props.status,
      dueDate: props.dueDate,
      approvedByUserId: props.approvedByUserId,
      rejectionReason: props.rejectionReason,
      version: props.version,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}

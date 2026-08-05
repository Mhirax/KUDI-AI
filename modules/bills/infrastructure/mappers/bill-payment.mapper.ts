import { BillPayment as PrismaBillPayment } from '@prisma/client';
import { BillPayment } from '../../domain/entities/bill-payment.entity';
import { BillReference } from '../../domain/value-objects/bill-reference.vo';
import { BillCategory } from '../../domain/enums/bill-category.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';
import { TransactionStatus } from '../../../../shared/enums/transaction-status.enum';

export class BillPaymentMapper {
  static toDomain(record: PrismaBillPayment): BillPayment {
    const currency = record.currency as Currency;
    return BillPayment.reconstitute({
      id: record.id,
      reference: BillReference.create(record.reference),
      userId: record.userId,
      accountId: record.accountId,
      category: record.category as BillCategory,
      billerCode: record.billerCode,
      itemCode: record.itemCode,
      billerName: record.billerName,
      customerIdentifier: record.customerIdentifier,
      amount: Money.fromMinorUnits(record.amountMinorUnits, currency),
      fee: Money.fromMinorUnits(record.feeMinorUnits, currency),
      status: record.status as TransactionStatus,
      providerReference: record.providerReference,
      valueToken: record.valueToken,
      failureReason: record.failureReason,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(billPayment: BillPayment): PrismaBillPayment {
    const props = billPayment.toProps();
    return {
      id: props.id,
      reference: props.reference.getValue(),
      userId: props.userId,
      accountId: props.accountId,
      category: props.category,
      billerCode: props.billerCode,
      itemCode: props.itemCode,
      billerName: props.billerName,
      customerIdentifier: props.customerIdentifier,
      amountMinorUnits: props.amount.getMinorUnits(),
      feeMinorUnits: props.fee.getMinorUnits(),
      currency: props.amount.getCurrency(),
      status: props.status,
      providerReference: props.providerReference,
      valueToken: props.valueToken,
      failureReason: props.failureReason,
      version: props.version,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}

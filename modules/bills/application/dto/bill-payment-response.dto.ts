import { BillPayment } from '../../domain/entities/bill-payment.entity';

export class BillPaymentResponseDto {
  id: string;
  reference: string;
  accountId: string;
  category: string;
  billerCode: string;
  billerName: string;
  customerIdentifier: string;
  /** Major-unit decimal strings — bigint minor units are never serialized directly. */
  amount: string;
  fee: string;
  currency: string;
  status: string;
  /** Provider-issued value token (e.g. prepaid electricity token). */
  valueToken: string | null;
  failureReason: string | null;
  createdAt: string;

  static fromDomain(billPayment: BillPayment): BillPaymentResponseDto {
    const props = billPayment.toProps();
    return {
      id: props.id,
      reference: props.reference.getValue(),
      accountId: props.accountId,
      category: props.category,
      billerCode: props.billerCode,
      billerName: props.billerName,
      customerIdentifier: props.customerIdentifier,
      amount: props.amount.toMajorUnitsString(),
      fee: props.fee.toMajorUnitsString(),
      currency: props.amount.getCurrency(),
      status: props.status,
      valueToken: props.valueToken,
      failureReason: props.failureReason,
      createdAt: props.createdAt.toISOString(),
    };
  }
}

import { Transfer } from '../../domain/entities/transfer.entity';

export class TransferResponseDto {
  id: string;
  reference: string;
  type: string;
  sourceAccountId: string;
  destinationAccountId: string | null;
  recipientBankCode: string | null;
  recipientAccountNumber: string | null;
  /** Major-unit decimal string, e.g. "1500.00". */
  amount: string;
  fee: string;
  currency: string;
  narration: string;
  status: string;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;

  static fromDomain(transfer: Transfer): TransferResponseDto {
    const props = transfer.toProps();
    return {
      id: props.id,
      reference: props.reference.getValue(),
      type: props.type,
      sourceAccountId: props.sourceAccountId,
      destinationAccountId: props.destinationAccountId,
      recipientBankCode: props.externalRecipient?.getBankCode() ?? null,
      recipientAccountNumber: props.externalRecipient?.getAccountNumber() ?? null,
      amount: props.amount.toMajorUnitsString(),
      fee: props.fee.toMajorUnitsString(),
      currency: props.amount.getCurrency(),
      narration: props.narration,
      status: props.status,
      failureReason: props.failureReason,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    };
  }
}

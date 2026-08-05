import { Transfer as PrismaTransfer } from '@prisma/client';
import { Transfer } from '../../domain/entities/transfer.entity';
import { TransferReference } from '../../domain/value-objects/transfer-reference.vo';
import { ExternalRecipient } from '../../domain/value-objects/external-recipient.vo';
import { Money } from '../../../../shared/value-objects/money.vo';
import { TransferType } from '../../domain/enums/transfer-type.enum';
import { TransactionStatus } from '../../../../shared/enums/transaction-status.enum';
import { Currency } from '../../../../shared/enums/currency.enum';

export class TransferMapper {
  static toDomain(record: PrismaTransfer): Transfer {
    const currency = record.currency as Currency;
    const externalRecipient =
      record.recipientBankCode && record.recipientAccountNumber
        ? ExternalRecipient.create({
            bankCode: record.recipientBankCode,
            accountNumber: record.recipientAccountNumber,
            accountName: record.recipientAccountName ?? undefined,
          })
        : null;

    return Transfer.reconstitute({
      id: record.id,
      reference: TransferReference.create(record.reference),
      type: record.type as TransferType,
      initiatorUserId: record.initiatorUserId,
      sourceAccountId: record.sourceAccountId,
      destinationAccountId: record.destinationAccountId,
      externalRecipient,
      amount: Money.fromMinorUnits(record.amountMinorUnits, currency),
      fee: Money.fromMinorUnits(record.feeMinorUnits, currency),
      narration: record.narration,
      status: record.status as TransactionStatus,
      failureReason: record.failureReason,
      providerReference: record.providerReference,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(transfer: Transfer): PrismaTransfer {
    const props = transfer.toProps();
    return {
      id: props.id,
      reference: props.reference.getValue(),
      type: props.type,
      initiatorUserId: props.initiatorUserId,
      sourceAccountId: props.sourceAccountId,
      destinationAccountId: props.destinationAccountId,
      recipientBankCode: props.externalRecipient?.getBankCode() ?? null,
      recipientAccountNumber: props.externalRecipient?.getAccountNumber() ?? null,
      recipientAccountName: props.externalRecipient?.getAccountName() ?? null,
      amountMinorUnits: props.amount.getMinorUnits(),
      feeMinorUnits: props.fee.getMinorUnits(),
      currency: props.amount.getCurrency(),
      narration: props.narration,
      status: props.status,
      failureReason: props.failureReason,
      providerReference: props.providerReference,
      version: props.version,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}

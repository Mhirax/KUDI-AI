import { Deposit as PrismaDeposit } from '@prisma/client';
import { Deposit } from '../../domain/entities/deposit.entity';
import { DepositReference } from '../../domain/value-objects/deposit-reference.vo';
import { DepositChannel } from '../../domain/enums/deposit-channel.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';
import { TransactionStatus } from '../../../../shared/enums/transaction-status.enum';

export class DepositMapper {
  static toDomain(record: PrismaDeposit): Deposit {
    return Deposit.reconstitute({
      id: record.id,
      reference: DepositReference.create(record.reference),
      channel: record.channel as DepositChannel,
      userId: record.userId,
      accountId: record.accountId,
      amount: Money.fromMinorUnits(record.amountMinorUnits, record.currency as Currency),
      status: record.status as TransactionStatus,
      providerTransactionId: record.providerTransactionId,
      failureReason: record.failureReason,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(deposit: Deposit): PrismaDeposit {
    const props = deposit.toProps();
    return {
      id: props.id,
      reference: props.reference.getValue(),
      channel: props.channel,
      userId: props.userId,
      accountId: props.accountId,
      amountMinorUnits: props.amount.getMinorUnits(),
      currency: props.amount.getCurrency(),
      status: props.status,
      providerTransactionId: props.providerTransactionId,
      failureReason: props.failureReason,
      version: props.version,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}

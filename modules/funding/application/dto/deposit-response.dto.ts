import { Deposit } from '../../domain/entities/deposit.entity';

export class DepositResponseDto {
  id: string;
  reference: string;
  channel: string;
  accountId: string;
  /** Major-unit decimal string — bigint minor units are never serialized directly. */
  amount: string;
  currency: string;
  status: string;
  failureReason: string | null;
  createdAt: string;

  static fromDomain(deposit: Deposit): DepositResponseDto {
    const props = deposit.toProps();
    return {
      id: props.id,
      reference: props.reference.getValue(),
      channel: props.channel,
      accountId: props.accountId,
      amount: props.amount.toMajorUnitsString(),
      currency: props.amount.getCurrency(),
      status: props.status,
      failureReason: props.failureReason,
      createdAt: props.createdAt.toISOString(),
    };
  }
}

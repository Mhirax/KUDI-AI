import { Account } from '../../domain/entities/account.entity';

export class AccountResponseDto {
  id: string;
  userId: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  /** Major-unit decimal string, e.g. "1999.00" — bigint minor units are never serialized directly. */
  balance: string;
  status: string;
  createdAt: string;
  updatedAt: string;

  static fromDomain(account: Account): AccountResponseDto {
    const props = account.toProps();
    return {
      id: props.id,
      userId: props.userId,
      accountNumber: props.accountNumber.getValue(),
      accountType: props.accountType,
      currency: props.currency,
      balance: props.balance.toMajorUnitsString(),
      status: props.status,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    };
  }
}

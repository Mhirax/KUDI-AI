import { Account as PrismaAccount } from '@prisma/client';
import { Account } from '../../domain/entities/account.entity';
import { AccountNumber } from '../../domain/value-objects/account-number.vo';
import { Money } from '../../../../shared/value-objects/money.vo';
import { AccountType } from '../../domain/enums/account-type.enum';
import { AccountStatus } from '../../../../shared/enums/account-status.enum';
import { Currency } from '../../../../shared/enums/currency.enum';

/**
 * Translates between the Prisma persistence model (balance stored as
 * a native `BigInt` column) and the domain `Account` aggregate, whose
 * `Money` value object also uses `bigint` internally — no precision is
 * ever lost crossing this boundary.
 */
export class AccountMapper {
  static toDomain(record: PrismaAccount): Account {
    return Account.reconstitute({
      id: record.id,
      userId: record.userId,
      accountNumber: AccountNumber.create(record.accountNumber),
      accountType: record.accountType as AccountType,
      currency: record.currency as Currency,
      balance: Money.fromMinorUnits(record.balance, record.currency as Currency),
      status: record.status as AccountStatus,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(account: Account): PrismaAccount {
    const props = account.toProps();
    return {
      id: props.id,
      userId: props.userId,
      accountNumber: props.accountNumber.getValue(),
      accountType: props.accountType,
      currency: props.currency,
      balance: props.balance.getMinorUnits(),
      status: props.status,
      version: props.version,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}

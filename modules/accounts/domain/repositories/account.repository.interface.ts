import { Account } from '../entities/account.entity';
import { AccountNumber } from '../value-objects/account-number.vo';

/**
 * Port for Account persistence. The concrete Prisma-backed adapter
 * lives in infrastructure/persistence, per the Repository Pattern.
 *
 * `save()` implementations must perform an optimistic-concurrency
 * check against `version` (see Account entity) to prevent lost
 * updates when concurrent credit/debit operations race — critical for
 * a ledger-adjacent aggregate.
 */
export interface IAccountRepository {
  findById(id: string): Promise<Account | null>;
  findByAccountNumber(accountNumber: AccountNumber): Promise<Account | null>;
  findAllByUserId(userId: string): Promise<Account[]>;
  existsByAccountNumber(accountNumber: AccountNumber): Promise<boolean>;
  save(account: Account): Promise<void>;
}

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

import { Account } from '../entities/account.entity';
import { Money } from '../../../../shared/value-objects/money.vo';

export interface IMaxBalanceGuard {
  /**
   * Throws `MaxBalanceExceededException` if crediting `amount` into
   * `account` would push its balance past the account holder's
   * KYC-tier max-balance ceiling. No-op if the tier has no cap.
   *
   * `tx`, when given, is a Prisma interactive-transaction client to run
   * the underlying KYC lookups through instead of the module-level
   * connection — for callers already inside a `$transaction` (e.g.
   * `PrismaInternalTransferExecutor`), so those lookups don't hold a
   * second pool connection alongside the transaction's own for their
   * duration. Typed `any` to match the executor's own documented
   * reasoning for not naming Prisma's transaction client type across
   * this boundary.
   */
  assertWithinLimit(account: Account, amount: Money, tx?: any): Promise<void>;
}

export const MAX_BALANCE_GUARD = Symbol('MAX_BALANCE_GUARD');

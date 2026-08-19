import { Account } from '../entities/account.entity';
import { Money } from '../../../../shared/value-objects/money.vo';

export interface IMaxBalanceGuard {
  /**
   * Throws `MaxBalanceExceededException` if crediting `amount` into
   * `account` would push its balance past the account holder's
   * KYC-tier max-balance ceiling. No-op if the tier has no cap.
   */
  assertWithinLimit(account: Account, amount: Money): Promise<void>;
}

export const MAX_BALANCE_GUARD = Symbol('MAX_BALANCE_GUARD');

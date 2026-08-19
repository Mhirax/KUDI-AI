import { Money } from '../../../../shared/value-objects/money.vo';

export interface IKycTransferLimitChecker {
  /**
   * Throws `TransferLimitExceededException` if `amount` would breach
   * the caller's KYC-tier per-transaction limit, or push their rolling
   * 24h transfer volume (as source account) past the tier's daily
   * limit. No-op if the tier has no cap for a given dimension.
   */
  assertWithinLimits(params: { userId: string; sourceAccountId: string; amount: Money }): Promise<void>;
}

export const KYC_TRANSFER_LIMIT_CHECKER = Symbol('KYC_TRANSFER_LIMIT_CHECKER');

import { Inject, Injectable } from '@nestjs/common';
import { IKycTransferLimitChecker } from '../../domain/services/kyc-transfer-limit-checker.interface';
import { TransferLimitExceededException } from '../../domain/exceptions/transfer-limit-exceeded.exception';
import { TRANSFER_REPOSITORY, ITransferRepository } from '../../domain/repositories/transfer.repository.interface';
import { Money } from '../../../../shared/value-objects/money.vo';

// Cross-module dependency on Compliance's published ports, same
// sanctioned pattern as Transfers -> Accounts (ACCOUNT_REPOSITORY).
import {
  KYC_TIER_RESOLVER,
  IKycTierResolver,
} from '../../../compliance/domain/services/kyc-tier-resolver.interface';
import {
  KYC_TIER_LIMIT_REPOSITORY,
  IKycTierLimitRepository,
} from '../../../compliance/domain/repositories/kyc-tier-limit.repository.interface';

const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Enforces per-transaction and rolling-24h-daily KYC tier limits
 * (modules/compliance/implementation.md, Phase 1c).
 *
 * Not run inside the same DB transaction as the debit: the daily-sum
 * check below and the eventual debit are two separate reads/writes, so
 * two transfers submitted concurrently — each individually under the
 * cap — could in principle combine to exceed it before either commits.
 * Acceptable for a foundation build with no real concurrent load yet;
 * revisit (e.g. re-check inside the debit transaction, or serialize on
 * the source account) before this matters in production.
 */
@Injectable()
export class KycTransferLimitCheckerService implements IKycTransferLimitChecker {
  constructor(
    @Inject(KYC_TIER_RESOLVER) private readonly kycTierResolver: IKycTierResolver,
    @Inject(KYC_TIER_LIMIT_REPOSITORY) private readonly kycTierLimitRepository: IKycTierLimitRepository,
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: ITransferRepository,
  ) {}

  async assertWithinLimits(params: {
    userId: string;
    sourceAccountId: string;
    amount: Money;
  }): Promise<void> {
    const { userId, sourceAccountId, amount } = params;

    const tier = await this.kycTierResolver.resolveTier(userId);
    const limits = await this.kycTierLimitRepository.findByTier(tier, amount.getCurrency());

    if (limits.perTransactionLimit && !limits.perTransactionLimit.isGreaterThanOrEqualTo(amount)) {
      throw new TransferLimitExceededException('per-transaction', tier);
    }

    if (limits.dailyTransferLimit) {
      const since = new Date(Date.now() - ROLLING_WINDOW_MS);
      const alreadyTransferredToday = await this.transferRepository.sumSourceAmountSince(
        sourceAccountId,
        since,
        amount.getCurrency(),
      );
      const projectedTotal = alreadyTransferredToday.add(amount);

      if (!limits.dailyTransferLimit.isGreaterThanOrEqualTo(projectedTotal)) {
        throw new TransferLimitExceededException('daily', tier);
      }
    }
  }
}

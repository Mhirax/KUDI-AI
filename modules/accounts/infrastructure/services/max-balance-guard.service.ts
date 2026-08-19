import { Inject, Injectable } from '@nestjs/common';
import { IMaxBalanceGuard } from '../../domain/services/max-balance-guard.interface';
import { MaxBalanceExceededException } from '../../domain/exceptions/max-balance-exceeded.exception';
import { Account } from '../../domain/entities/account.entity';
import { Money } from '../../../../shared/value-objects/money.vo';

// Cross-module dependency on Compliance's published ports, same
// sanctioned pattern as Transfers -> Compliance
// (KycTransferLimitCheckerService).
import {
  KYC_TIER_RESOLVER,
  IKycTierResolver,
} from '../../../compliance/domain/services/kyc-tier-resolver.interface';
import {
  KYC_TIER_LIMIT_REPOSITORY,
  IKycTierLimitRepository,
} from '../../../compliance/domain/repositories/kyc-tier-limit.repository.interface';

/**
 * Enforces the KYC-tier max-balance ceiling on credit operations
 * (modules/compliance/implementation.md, Phase 1d). Shared by
 * `CreditAccountHandler` (Accounts) and `PrismaInternalTransferExecutor`
 * (Transfers, crediting the destination account) so the check has one
 * implementation instead of two copies that could quietly drift apart.
 */
@Injectable()
export class MaxBalanceGuardService implements IMaxBalanceGuard {
  constructor(
    @Inject(KYC_TIER_RESOLVER) private readonly kycTierResolver: IKycTierResolver,
    @Inject(KYC_TIER_LIMIT_REPOSITORY) private readonly kycTierLimitRepository: IKycTierLimitRepository,
  ) {}

  async assertWithinLimit(account: Account, amount: Money, tx?: any): Promise<void> {
    const tier = await this.kycTierResolver.resolveTier(account.userId, tx);
    const limits = await this.kycTierLimitRepository.findByTier(tier, account.currency, tx);

    if (limits.maxBalance && !limits.maxBalance.isGreaterThanOrEqualTo(account.balance.add(amount))) {
      throw new MaxBalanceExceededException(tier);
    }
  }
}

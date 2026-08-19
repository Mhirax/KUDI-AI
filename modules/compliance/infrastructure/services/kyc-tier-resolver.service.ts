import { Inject, Injectable } from '@nestjs/common';
import { IKycTierResolver } from '../../domain/services/kyc-tier-resolver.interface';
import {
  KYC_PROFILE_REPOSITORY,
  IKycProfileRepository,
} from '../../domain/repositories/kyc-profile.repository.interface';
import { KycTier } from '../../domain/enums/kyc-tier.enum';

/**
 * Single source of truth for "what tier is this user at, including the
 * no-profile fallback" — previously duplicated identically in
 * `MaxBalanceGuardService` (Accounts) and `KycTransferLimitCheckerService`
 * (Transfers). See modules/compliance/implementation.md, post-review
 * finding #5.
 */
@Injectable()
export class KycTierResolverService implements IKycTierResolver {
  constructor(
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
  ) {}

  async resolveTier(userId: string): Promise<KycTier> {
    const profile = await this.kycProfileRepository.findByUserId(userId);
    return profile?.tier ?? KycTier.TIER_1;
  }
}

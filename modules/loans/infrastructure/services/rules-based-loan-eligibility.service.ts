import { Inject, Injectable } from '@nestjs/common';
import {
  ILoanEligibilityService,
  LoanEligibilityResult,
} from '../../domain/services/loan-eligibility.interface';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../accounts/domain/repositories/account.repository.interface';
import {
  KYC_PROFILE_REPOSITORY,
  IKycProfileRepository,
} from '../../../compliance/domain/repositories/kyc-profile.repository.interface';
import { KycTier } from '../../../compliance/domain/enums/kyc-tier.enum';
import { AccountStatus } from '../../../../shared/enums/account-status.enum';

/**
 * v1 loan eligibility is deliberately rules-based off data the
 * platform already has — KYC tier and account status — rather than an
 * external credit-bureau/scoring integration (see module README for
 * the rationale and the follow-up work this defers).
 *
 * Tier-gated principal ceilings (minor units, NGN kobo):
 *   TIER_1 — not eligible (BVN unverified; too much default risk)
 *   TIER_2 — up to ₦100,000
 *   TIER_3 — up to ₦500,000
 */
@Injectable()
export class RulesBasedLoanEligibilityService implements ILoanEligibilityService {
  private static readonly TIER_2_MAX_MINOR_UNITS = 10_000_000n; // ₦100,000.00
  private static readonly TIER_3_MAX_MINOR_UNITS = 50_000_000n; // ₦500,000.00

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
  ) {}

  async assess(userId: string, accountId: string): Promise<LoanEligibilityResult> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || account.userId !== userId) {
      return { isEligible: false, reason: 'account not found', maxPrincipalMinorUnits: 0n };
    }
    if (account.status !== AccountStatus.ACTIVE) {
      return { isEligible: false, reason: 'account is not active', maxPrincipalMinorUnits: 0n };
    }

    const profile = await this.kycProfileRepository.findByUserId(userId);
    if (!profile) {
      return { isEligible: false, reason: 'KYC profile not found', maxPrincipalMinorUnits: 0n };
    }

    switch (profile.tier) {
      case KycTier.TIER_1:
        return {
          isEligible: false,
          reason: 'BVN verification (KYC Tier 2) is required before applying for a loan',
          maxPrincipalMinorUnits: 0n,
        };
      case KycTier.TIER_2:
        return {
          isEligible: true,
          reason: null,
          maxPrincipalMinorUnits: RulesBasedLoanEligibilityService.TIER_2_MAX_MINOR_UNITS,
        };
      case KycTier.TIER_3:
        return {
          isEligible: true,
          reason: null,
          maxPrincipalMinorUnits: RulesBasedLoanEligibilityService.TIER_3_MAX_MINOR_UNITS,
        };
      default:
        return { isEligible: false, reason: 'unrecognized KYC tier', maxPrincipalMinorUnits: 0n };
    }
  }
}

import { KycProfile } from '../../domain/entities/kyc-profile.entity';

/**
 * Staff-only — deliberately separate from `KycStatusResponseDto` (used
 * by the customer-facing `GET /kyc/me`) so a sanctions flag can never
 * leak to the flagged user's own status response. Tipping off the
 * subject of an active review is the opposite of what AML/CFT process
 * wants.
 */
export class FlaggedSanctionsProfileResponseDto {
  userId: string;
  tier: string;
  flaggedAt: string;

  static fromDomain(profile: KycProfile): FlaggedSanctionsProfileResponseDto {
    return {
      userId: profile.userId,
      tier: profile.tier,
      flaggedAt: profile.sanctionsFlaggedAt!.toISOString(),
    };
  }
}

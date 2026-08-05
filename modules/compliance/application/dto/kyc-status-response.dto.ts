import { KycProfile } from '../../domain/entities/kyc-profile.entity';

export class KycStatusResponseDto {
  userId: string;
  tier: string;
  bvnVerified: boolean;
  bvnVerifiedAt: string | null;
  bvnMasked: string | null;
  ninVerified: boolean;
  ninVerifiedAt: string | null;
  ninMasked: string | null;

  static fromDomain(profile: KycProfile): KycStatusResponseDto {
    return {
      userId: profile.userId,
      tier: profile.tier,
      bvnVerified: profile.bvnVerifiedAt !== null,
      bvnVerifiedAt: profile.bvnVerifiedAt?.toISOString() ?? null,
      bvnMasked: profile.bvnMasked,
      ninVerified: profile.ninVerifiedAt !== null,
      ninVerifiedAt: profile.ninVerifiedAt?.toISOString() ?? null,
      ninMasked: profile.ninMasked,
    };
  }
}

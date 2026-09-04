import { KycProfile as PrismaKycProfile } from '@prisma/client';
import { KycProfile } from '../../domain/entities/kyc-profile.entity';
import { KycTier } from '../../domain/enums/kyc-tier.enum';

export class KycProfileMapper {
  static toDomain(record: PrismaKycProfile): KycProfile {
    return KycProfile.reconstitute({
      id: record.id,
      userId: record.userId,
      tier: record.tier as KycTier,
      bvnVerifiedAt: record.bvnVerifiedAt,
      bvnHash: record.bvnHash,
      bvnMasked: record.bvnMasked,
      ninVerifiedAt: record.ninVerifiedAt,
      ninHash: record.ninHash,
      ninMasked: record.ninMasked,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Deliberately omits sanctionsFlaggedAt and sanctionsClearedAt.
   *
   * Those columns exist in the database but the KycProfile aggregate does
   * not model them yet, so this mapper has no value to contribute. The
   * result is used for `updateMany` as well as `create`, and emitting them
   * as null would clear a profile's sanctions screening state on every
   * unrelated save. Omitting them leaves whatever the database holds
   * untouched, which is the only safe answer until the aggregate models
   * them properly.
   */
  static toPersistence(
    profile: KycProfile,
  ): Omit<PrismaKycProfile, 'sanctionsFlaggedAt' | 'sanctionsClearedAt'> {
    const props = profile.toProps();
    return {
      id: props.id,
      userId: props.userId,
      tier: props.tier,
      bvnVerifiedAt: props.bvnVerifiedAt,
      bvnHash: props.bvnHash,
      bvnMasked: props.bvnMasked,
      ninVerifiedAt: props.ninVerifiedAt,
      ninHash: props.ninHash,
      ninMasked: props.ninMasked,
      version: props.version,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}

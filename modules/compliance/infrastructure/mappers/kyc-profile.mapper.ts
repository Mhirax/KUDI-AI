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
      sanctionsFlaggedAt: record.sanctionsFlaggedAt,
      sanctionsClearedAt: record.sanctionsClearedAt,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(profile: KycProfile): PrismaKycProfile {
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
      sanctionsFlaggedAt: props.sanctionsFlaggedAt,
      sanctionsClearedAt: props.sanctionsClearedAt,
      version: props.version,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}

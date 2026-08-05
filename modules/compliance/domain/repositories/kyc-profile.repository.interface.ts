import { KycProfile } from '../entities/kyc-profile.entity';

export interface IKycProfileRepository {
  findById(id: string): Promise<KycProfile | null>;
  findByUserId(userId: string): Promise<KycProfile | null>;
  save(profile: KycProfile): Promise<void>;
}

export const KYC_PROFILE_REPOSITORY = Symbol('KYC_PROFILE_REPOSITORY');

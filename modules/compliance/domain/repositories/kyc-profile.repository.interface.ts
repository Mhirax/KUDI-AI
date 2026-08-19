import { KycProfile } from '../entities/kyc-profile.entity';

export interface IKycProfileRepository {
  findById(id: string): Promise<KycProfile | null>;
  /**
   * `tx`, when given, is a Prisma interactive-transaction client to run
   * this read through instead of the module-level connection — for
   * callers already inside a `$transaction` (e.g.
   * `PrismaInternalTransferExecutor`), so this read doesn't hold a
   * second pool connection alongside the transaction's own. Typed `any`
   * to match the executor's own documented reasoning for not naming
   * Prisma's transaction client type across this boundary.
   */
  findByUserId(userId: string, tx?: any): Promise<KycProfile | null>;
  save(profile: KycProfile): Promise<void>;
}

export const KYC_PROFILE_REPOSITORY = Symbol('KYC_PROFILE_REPOSITORY');

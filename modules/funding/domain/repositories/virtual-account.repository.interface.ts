import { VirtualAccount } from '../entities/virtual-account.entity';

/**
 * Port for VirtualAccount persistence. Virtual accounts are created
 * once and never mutated (deactivation, if ever needed, will be an
 * explicit new capability) — hence `save()` here is create-only.
 */
export interface IVirtualAccountRepository {
  findByAccountId(accountId: string): Promise<VirtualAccount | null>;
  findByProviderReference(providerReference: string): Promise<VirtualAccount | null>;
  findAllByUserId(userId: string): Promise<VirtualAccount[]>;
  save(virtualAccount: VirtualAccount): Promise<void>;
}

export const VIRTUAL_ACCOUNT_REPOSITORY = Symbol('VIRTUAL_ACCOUNT_REPOSITORY');

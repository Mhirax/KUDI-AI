import { Deposit } from '../entities/deposit.entity';
import { DepositReference } from '../value-objects/deposit-reference.vo';

export interface DepositPage {
  deposits: Deposit[];
  total: number;
}

/**
 * Port for Deposit persistence. `save()` implementations must perform
 * an optimistic-concurrency check against `version` (see the Deposit
 * entity), mirroring IAccountRepository — a deposit settling twice is
 * a double-credit incident.
 */
export interface IDepositRepository {
  findById(id: string): Promise<Deposit | null>;
  findByReference(reference: DepositReference): Promise<Deposit | null>;
  findByProviderTransactionId(providerTransactionId: string): Promise<Deposit | null>;
  findPageByUserId(params: { userId: string; page: number; limit: number }): Promise<DepositPage>;
  save(deposit: Deposit): Promise<void>;
}

export const DEPOSIT_REPOSITORY = Symbol('DEPOSIT_REPOSITORY');

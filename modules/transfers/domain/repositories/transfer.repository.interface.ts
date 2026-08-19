import { Transfer } from '../entities/transfer.entity';
import { TransferReference } from '../value-objects/transfer-reference.vo';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

export interface ITransferRepository {
  findById(id: string): Promise<Transfer | null>;
  findByReference(reference: TransferReference): Promise<Transfer | null>;
  findByProviderReference(providerReference: string): Promise<Transfer | null>;
  findAllByUserId(userId: string): Promise<Transfer[]>;
  save(transfer: Transfer): Promise<void>;
  /**
   * Sum of `amount` (principal only, not fee) across this account's
   * SUCCESSFUL/PROCESSING transfers (as source) since `since`. Used to
   * enforce the rolling 24h KYC-tier daily transfer limit — see
   * modules/compliance/implementation.md, Phase 1c.
   */
  sumSourceAmountSince(sourceAccountId: string, since: Date, currency: Currency): Promise<Money>;
}

export const TRANSFER_REPOSITORY = Symbol('TRANSFER_REPOSITORY');

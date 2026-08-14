import { Transfer } from '../entities/transfer.entity';
import { TransferReference } from '../value-objects/transfer-reference.vo';

export interface ITransferRepository {
  findById(id: string): Promise<Transfer | null>;
  findByReference(reference: TransferReference): Promise<Transfer | null>;
  findByProviderReference(providerReference: string): Promise<Transfer | null>;
  findAllByUserId(userId: string): Promise<Transfer[]>;
  save(transfer: Transfer): Promise<void>;
}

export const TRANSFER_REPOSITORY = Symbol('TRANSFER_REPOSITORY');

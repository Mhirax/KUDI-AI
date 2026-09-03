import { Transfer } from '../entities/transfer.entity';
import { TransferReference } from '../value-objects/transfer-reference.vo';

export interface ITransferRepository {
  findById(id: string): Promise<Transfer | null>;
  findByReference(reference: TransferReference): Promise<Transfer | null>;
  findByProviderReference(providerReference: string): Promise<Transfer | null>;
  findAllByUserId(userId: string): Promise<Transfer[]>;

  /**
   * One page of a user's transfers, newest first, with the total count.
   *
   * findAllByUserId is unbounded and stays only for internal callers that
   * genuinely need every row. Anything serving an HTTP response uses this:
   * a customer with years of history would otherwise have their entire
   * transaction list loaded into memory and serialized on every request.
   */
  findPageByUserId(
    userId: string,
    skip: number,
    take: number,
  ): Promise<{ transfers: Transfer[]; total: number }>;
  save(transfer: Transfer): Promise<void>;
}

export const TRANSFER_REPOSITORY = Symbol('TRANSFER_REPOSITORY');

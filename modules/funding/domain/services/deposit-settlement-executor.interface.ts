import { Deposit } from '../entities/deposit.entity';
import { DomainEvent } from '../../../../shared/events/domain-event.base';

export interface DepositSettlementResult {
  deposit: Deposit;
  events: DomainEvent[];
}

/**
 * Domain service port for settling a verified deposit: marking the
 * Deposit SUCCESSFUL (claiming its unique provider transaction id) and
 * crediting the target Account — atomically, in one database
 * transaction.
 *
 * This is the same "spans two aggregates atomically" requirement that
 * Transfers' IInternalTransferExecutor names explicitly (see that
 * port's header for the full rationale): expressing it through the
 * individual repositories would either leak a transaction handle
 * through every method or accept that a crash between "deposit marked
 * settled" and "account credited" strands or double-credits money.
 * The concrete implementation carries the same deliberate, documented
 * coupling to Accounts' entity/mapper as Transfers' executor, and is
 * likewise expected to be replaced when the Rust ledger-engine takes
 * ownership of money movement.
 */
export interface IDepositSettlementExecutor {
  settle(params: {
    deposit: Deposit;
    providerTransactionId: string;
    /**
     * Whether the deposit row already exists (checkout deposits are
     * persisted at initiation; virtual-account deposits are created
     * and settled in the same webhook handling).
     */
    alreadyPersisted: boolean;
  }): Promise<DepositSettlementResult>;
}

export const DEPOSIT_SETTLEMENT_EXECUTOR = Symbol('DEPOSIT_SETTLEMENT_EXECUTOR');

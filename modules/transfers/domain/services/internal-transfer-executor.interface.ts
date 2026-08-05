import { Money } from '../../../../shared/value-objects/money.vo';
import { Transfer } from '../entities/transfer.entity';
import { DomainEvent } from '../../../../shared/events/domain-event.base';

export interface InternalTransferExecutionResult {
  transfer: Transfer;
  events: DomainEvent[];
}

/**
 * Domain service port for executing an internal transfer's balance
 * mutations atomically across two `Account` aggregates plus the
 * `Transfer` aggregate itself. This exists because a single Prisma
 * transaction spanning two Account rows and one Transfer row cannot be
 * expressed through the individual `IAccountRepository`/
 * `ITransferRepository` ports without either leaking a transaction
 * handle through every repository method or accepting a lost-update
 * risk — this port names that "spans two aggregates atomically"
 * requirement explicitly rather than working around it.
 *
 * The concrete implementation
 * (infrastructure/services/prisma-internal-transfer-executor.service.ts)
 * necessarily depends on the Accounts module's `Account` entity and
 * Prisma mapper directly — a deliberate, documented cross-module
 * coupling scoped to this one operation. It is expected to be replaced
 * entirely once money movement is delegated to the Rust
 * `ledger-engine`, which will own this atomicity guarantee instead.
 */
export interface IInternalTransferExecutor {
  execute(params: {
    initiatorUserId: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amount: Money;
    fee: Money;
    narration: string;
  }): Promise<InternalTransferExecutionResult>;
}

export const INTERNAL_TRANSFER_EXECUTOR = Symbol('INTERNAL_TRANSFER_EXECUTOR');

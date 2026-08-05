import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IInternalTransferExecutor,
  InternalTransferExecutionResult,
} from '../../domain/services/internal-transfer-executor.interface';
import { Transfer } from '../../domain/entities/transfer.entity';
import {
  ITransferRepository,
  TRANSFER_REPOSITORY,
} from '../../domain/repositories/transfer.repository.interface';
import { Money } from '../../../../shared/value-objects/money.vo';
import { LedgerEngineClient } from '../../../../infrastructure/grpc/ledger/ledger-engine.client';

// Deliberate cross-module dependency on Accounts' exported port only
// (ACCOUNT_REPOSITORY) — unlike PrismaInternalTransferExecutor, this
// implementation never touches Accounts' Account entity or Prisma
// mapper directly, because it no longer needs cross-aggregate
// transactional atomicity: the ledger-engine itself now owns that
// guarantee. This is the payoff described in that file's header
// comment — swapping the executor implementation required zero
// changes to any domain or application code in either module.
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../accounts/domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../accounts/domain/exceptions/account-not-found.exception';
import { UnauthorizedTransferException } from '../../domain/exceptions/unauthorized-transfer.exception';

/**
 * Ledger-engine-backed implementation of `IInternalTransferExecutor`.
 *
 * The Rust ledger-engine is now the source of truth for the atomic
 * debit/credit posting (see /rust/ledger-engine/src/repository.rs);
 * this class's job is to validate the request using the NestJS-side
 * `Account` domain invariants (currency, active status, a fast local
 * sufficient-funds pre-check), call the ledger engine to perform the
 * authoritative, durable posting, and then persist the resulting
 * balances into the NestJS-side `Account` projection.
 *
 * Known limitation: steps "call the ledger engine" and "persist the
 * NestJS projection" are not themselves wrapped in a single
 * transaction (they can't be — one is a network call to another
 * service). If the ledger engine call succeeds but the subsequent
 * projection save fails, the two sides temporarily disagree. Detecting
 * and correcting exactly this kind of drift is what
 * `/rust/reconciliation-engine` exists for in a future phase; it is
 * not implemented here.
 */
@Injectable()
export class GrpcInternalTransferExecutor implements IInternalTransferExecutor {
  private readonly logger = new Logger(GrpcInternalTransferExecutor.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: ITransferRepository,
    private readonly ledgerEngineClient: LedgerEngineClient,
  ) {}

  async execute(params: {
    initiatorUserId: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amount: Money;
    fee: Money;
    narration: string;
  }): Promise<InternalTransferExecutionResult> {
    const transfer = Transfer.initiateInternal({
      initiatorUserId: params.initiatorUserId,
      sourceAccountId: params.sourceAccountId,
      destinationAccountId: params.destinationAccountId,
      amount: params.amount,
      fee: params.fee,
      narration: params.narration,
    });

    try {
      const sourceAccount = await this.accountRepository.findById(params.sourceAccountId);
      if (!sourceAccount) {
        throw new AccountNotFoundException(params.sourceAccountId);
      }
      const destinationAccount = await this.accountRepository.findById(params.destinationAccountId);
      if (!destinationAccount) {
        throw new AccountNotFoundException(params.destinationAccountId);
      }
      if (sourceAccount.userId !== params.initiatorUserId) {
        throw new UnauthorizedTransferException();
      }

      // Fee is not yet posted as a separate ledger entry (no
      // fee-revenue GL account exists yet — same documented limitation
      // as PrismaInternalTransferExecutor); the ledger only records
      // the principal movement.
      const totalDebit = params.amount.add(params.fee);

      // Domain-invariant pre-check against the local projection
      // (currency match, active status, sufficient funds). This can
      // be stale relative to the ledger engine's own authoritative
      // state, but catches the overwhelming majority of invalid
      // requests before ever making a network call.
      sourceAccount.debit(totalDebit, transfer.reference.getValue());
      destinationAccount.credit(params.amount, transfer.reference.getValue());

      await this.ledgerEngineClient.postDoubleEntry({
        idempotencyKey: transfer.reference.getValue(),
        debitExternalAccountId: params.sourceAccountId,
        creditExternalAccountId: params.destinationAccountId,
        amountMinorUnits: params.amount.getMinorUnits(),
        currency: params.amount.getCurrency(),
        narration: params.narration,
      });

      await this.accountRepository.save(sourceAccount);
      await this.accountRepository.save(destinationAccount);

      transfer.markSuccessful();

      const events = [
        ...transfer.pullDomainEvents(),
        ...sourceAccount.pullDomainEvents(),
        ...destinationAccount.pullDomainEvents(),
      ];

      return { transfer, events };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Internal transfer failed';
      this.logger.warn(`Internal transfer ${transfer.reference.getValue()} failed: ${reason}`);
      transfer.markFailed(reason);
      await this.transferRepository.save(transfer);
      throw error;
    }
  }
}

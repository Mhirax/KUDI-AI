import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IInternalTransferExecutor,
  InternalTransferExecutionResult,
} from '../../domain/services/internal-transfer-executor.interface';
import { Transfer } from '../../domain/entities/transfer.entity';
import {
  ITransferRepository,
  TRANSFER_REPOSITORY,
} from '../../domain/repositories/transfer.repository.interface';
import { UnauthorizedTransferException } from '../../domain/exceptions/unauthorized-transfer.exception';
import { TransferMapper } from '../mappers/transfer.mapper';
import { Money } from '../../../../shared/value-objects/money.vo';
import { DomainException } from '../../../../shared/exceptions/domain.exception';
import { DomainEvent } from '../../../../shared/events/domain-event.base';

// Deliberate, documented cross-module coupling — see this file's class
// header and /modules/transfers/domain/services/internal-transfer-executor.interface.ts
// for why. Both are Accounts' own public domain entity + infrastructure
// mapper, not private implementation detail reached into improperly.
import { Account } from '../../../accounts/domain/entities/account.entity';
import { SystemAccountService } from '../../../accounts/application/services/system-account.service';
import { AccountMapper } from '../../../accounts/infrastructure/mappers/account.mapper';
import { AccountNotFoundException } from '../../../accounts/domain/exceptions/account-not-found.exception';

/**
 * Prisma-backed implementation of `IInternalTransferExecutor` — the
 * default when `LEDGER_ENGINE_ENABLED` is false (see
 * `transfers.module.ts`'s executor factory). Once the Rust
 * ledger-engine is deployed and toggled on,
 * `GrpcInternalTransferExecutor` (same directory) takes over and this
 * class's cross-aggregate atomicity trick below is no longer needed
 * for new transfers — this implementation remains available as a
 * fallback for environments running without the Rust service (e.g.
 * local development).
 *
 * Happy path: both accounts are loaded, mutated via their own domain
 * methods (so `Account`'s currency/sufficient-funds/active-status
 * invariants still apply), and — together with the new `Transfer`
 * row — written inside a single `prisma.$transaction`, each account
 * write conditioned on its expected `version` (optimistic concurrency).
 * If anything throws inside the callback, Prisma rolls back the entire
 * transaction automatically — no partial debit/credit can ever be
 * persisted.
 *
 * Failure path: if the transaction throws (insufficient funds, a
 * concurrent-modification conflict, an inactive account, etc.), a
 * `Transfer` row is still persisted — outside the rolled-back
 * transaction — with status `FAILED`, so failed attempts remain
 * auditable. The original error is then rethrown so the caller (and
 * ultimately the HTTP response) still reflects the real failure
 * reason.
 */
@Injectable()
export class PrismaInternalTransferExecutor implements IInternalTransferExecutor {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: ITransferRepository,
    private readonly systemAccounts: SystemAccountService,
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

    let accountEvents: DomainEvent[] = [];
    let feeEvents: DomainEvent[] = [];

    try {
      // See saveAccountInTransaction()'s comment below re: the `any`
      // type on the transaction client.
      await this.prisma.$transaction(async (tx: any) => {
        const sourceRecord = await tx.account.findUnique({ where: { id: params.sourceAccountId } });
        if (!sourceRecord) {
          throw new AccountNotFoundException(params.sourceAccountId);
        }
        const destinationRecord = await tx.account.findUnique({
          where: { id: params.destinationAccountId },
        });
        if (!destinationRecord) {
          throw new AccountNotFoundException(params.destinationAccountId);
        }

        const sourceAccount = AccountMapper.toDomain(sourceRecord);
        const destinationAccount = AccountMapper.toDomain(destinationRecord);

        if (sourceAccount.userId !== params.initiatorUserId) {
          throw new UnauthorizedTransferException();
        }

        // Debit total (amount + fee) from the source; credit only the
        // principal amount to the destination. The fee difference is
        // retained as platform revenue — booked to a fee-revenue
        // ledger account once the Rust ledger-engine integration
        // lands; tracked here only implicitly via Transfer.fee today.
        const totalDebit = params.amount.add(params.fee);
        sourceAccount.debit(totalDebit, transfer.reference.getValue());
        destinationAccount.credit(params.amount, transfer.reference.getValue());

        await this.saveAccountInTransaction(tx, sourceAccount);
        await this.saveAccountInTransaction(tx, destinationAccount);

        // The fee is credited to Kudi's fee-revenue account, inside this same
        // transaction. It used to be debited from the sender and credited
        // nowhere, so the amount left the books entirely: total debits
        // exceeded total credits by the fee on every single transfer, and no
        // trial balance could ever balance.
        if (!params.fee.isZero()) {
          const feeAccount = await this.systemAccounts.feeRevenueAccount(params.fee.getCurrency());
          feeAccount.credit(params.fee, transfer.reference.getValue());
          await this.saveAccountInTransaction(tx, feeAccount);
          feeEvents = feeAccount.pullDomainEvents();
        }

        transfer.markSuccessful();
        const transferData = TransferMapper.toPersistence(transfer);
        await tx.transfer.create({ data: transferData });

        accountEvents = [
          ...sourceAccount.pullDomainEvents(),
          ...destinationAccount.pullDomainEvents(),
          ...feeEvents,
        ];
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Internal transfer failed';

      // `transfer` has never been persisted at this point — the only INSERT
      // is the single combined write on the success path, inside the
      // transaction that just rolled back. Calling markFailed() first would
      // bump the version via touch() before any row exists, so save() would
      // read that as an update to an existing row (previousVersion = 0,
      // matching nothing) and report a phantom "modified concurrently"
      // conflict — masking whatever actually went wrong (insufficient
      // funds, an inactive account, ...) behind a misleading one. Same
      // "persist before you mutate a freshly-opened aggregate" fix applied
      // to reward accounts and system accounts elsewhere in this session:
      // save the pristine, version-0 transfer first (a genuine insert),
      // then mutate and save again.
      await this.transferRepository.save(transfer);

      transfer.markFailed(reason);
      await this.transferRepository.save(transfer);
      throw error;
    }

    const events = [...transfer.pullDomainEvents(), ...accountEvents];
    return { transfer, events };
  }

  // `tx` is Prisma's interactive-transaction client — typed `any` here
  // deliberately rather than importing Prisma's internal transaction
  // client type, which is awkward to name explicitly across a Nest
  // provider boundary; its usage below is narrow (two calls) and
  // fully covered by the `PrismaService` type everywhere else.
  private async saveAccountInTransaction(tx: any, account: Account): Promise<void> {
    const data = AccountMapper.toPersistence(account);
    const previousVersion = data.version - 1;

    const result = await tx.account.updateMany({
      where: { id: data.id, version: previousVersion },
      data,
    });

    if (result.count === 0) {
      throw new DomainException(
        `Account ${data.id} was modified concurrently; please retry`,
        'CONCURRENT_MODIFICATION',
      );
    }
  }
}

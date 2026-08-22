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
import { AccountMapper } from '../../../accounts/infrastructure/mappers/account.mapper';
import { AccountNotFoundException } from '../../../accounts/domain/exceptions/account-not-found.exception';
import {
  MAX_BALANCE_GUARD,
  IMaxBalanceGuard,
} from '../../../accounts/domain/services/max-balance-guard.interface';
import {
  LEDGER_RECORDER,
  ILedgerRecorder,
  LedgerPostingLeg,
} from '../../../../shared/ledger/ledger-recorder.interface';
import { LedgerEntryDirection } from '../../../../shared/ledger/ledger-entry-direction.enum';
import { LedgerEntryType } from '../../../../shared/ledger/ledger-entry-type.enum';
import { SystemLedgerAccount } from '../../../../shared/ledger/system-ledger-account';

/**
 * Prisma-backed implementation of `IInternalTransferExecutor`.
 *
 * Happy path: both accounts are loaded, mutated via their own domain
 * methods (so `Account`'s currency/sufficient-funds/active-status
 * invariants still apply), and — together with the new `Transfer` row
 * and a balanced double-entry ledger posting (shared/ledger, gap #2 of
 * modules/transfers/implementation.md) — written inside a single
 * `prisma.$transaction`, each account write conditioned on its
 * expected `version` (optimistic concurrency). If anything throws
 * inside the callback, Prisma rolls back the entire transaction
 * automatically — no partial debit/credit, and no unbalanced ledger
 * entry, can ever be persisted.
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
    @Inject(MAX_BALANCE_GUARD) private readonly maxBalanceGuard: IMaxBalanceGuard,
    @Inject(LEDGER_RECORDER) private readonly ledgerRecorder: ILedgerRecorder,
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

    try {
      // See saveAccountInTransaction()'s comment below re: the `any`
      // type on the transaction client. Explicit options because
      // Prisma's default interactive-transaction timeout (5s) is tight
      // for this transaction's full query count (two account loads, the
      // max-balance guard's own lookups, two optimistic-concurrency
      // account writes, and the ledger posting — including, for a
      // synthetic system-account leg, an extra read to compute its
      // running balance) against Neon's network latency; 15s matches
      // the timeout already used for Flutterwave's own HTTP calls
      // elsewhere in this codebase.
      await this.prisma.$transaction(
        async (tx: any) => {
          const sourceRecord = await tx.account.findUnique({
            where: { id: params.sourceAccountId },
          });
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
          // retained as platform revenue, booked to a synthetic
          // fee-revenue ledger account below (see the ledgerRecorder.post
          // call) so the double-entry posting still balances.
          const totalDebit = params.amount.add(params.fee);
          sourceAccount.debit(totalDebit, transfer.reference.getValue());

          // KYC-tier max-balance ceiling on the destination (Phase 1d of
          // modules/compliance/implementation.md). Checked here, inside
          // this transaction and against the just-loaded destinationAccount,
          // so — unlike the per-transaction/daily checks in
          // KycTransferLimitCheckerService — this one has no race-condition
          // caveat: a throw here rolls back the whole transaction via the
          // catch block below. `tx` is passed through so the guard's own
          // KYC lookups run on this same reserved connection instead of
          // checking out a second one from the pool for their duration
          // (post-review finding #4 — see modules/compliance/implementation.md).
          await this.maxBalanceGuard.assertWithinLimit(destinationAccount, params.amount, tx);
          destinationAccount.credit(params.amount, transfer.reference.getValue());

          await this.saveAccountInTransaction(tx, sourceAccount);
          await this.saveAccountInTransaction(tx, destinationAccount);

          // Double-entry journal, atomic with the two account writes
          // above (modules/transfers/implementation.md, gap #2). The fee
          // — retained as platform revenue rather than credited to the
          // destination — gets its own leg to a synthetic system account
          // so the posting still balances: debit(amount+fee) must equal
          // credit(amount) + credit(fee).
          const legs: LedgerPostingLeg[] = [
            {
              accountId: sourceAccount.id,
              direction: LedgerEntryDirection.DEBIT,
              amount: totalDebit,
              balanceAfter: sourceAccount.balance,
            },
            {
              accountId: destinationAccount.id,
              direction: LedgerEntryDirection.CREDIT,
              amount: params.amount,
              balanceAfter: destinationAccount.balance,
            },
          ];
          if (!params.fee.isZero()) {
            legs.push({
              accountId: SystemLedgerAccount.feeRevenue(params.fee.getCurrency()),
              direction: LedgerEntryDirection.CREDIT,
              amount: params.fee,
            });
          }
          await this.ledgerRecorder.post(
            {
              reference: transfer.reference.getValue(),
              narration: params.narration,
              userId: params.initiatorUserId,
              entryType: LedgerEntryType.TRANSFER,
              legs,
            },
            tx,
          );

          transfer.markSuccessful();
          const transferData = TransferMapper.toPersistence(transfer);
          await tx.transfer.create({ data: transferData });

          accountEvents = [
            ...sourceAccount.pullDomainEvents(),
            ...destinationAccount.pullDomainEvents(),
          ];
        },
        { maxWait: 5000, timeout: 15000 },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Internal transfer failed';
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

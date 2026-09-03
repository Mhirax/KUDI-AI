import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IDepositSettlementExecutor,
  DepositSettlementResult,
} from '../../domain/services/deposit-settlement-executor.interface';
import { Deposit } from '../../domain/entities/deposit.entity';
import { DepositMapper } from '../mappers/deposit.mapper';
import { DomainException } from '../../../../shared/exceptions/domain.exception';
import { DomainEvent } from '../../../../shared/events/domain-event.base';

// Deliberate, documented cross-module coupling — the exact pattern of
// Transfers' PrismaInternalTransferExecutor (see that file's header):
// Accounts' own public domain entity + mapper, needed to mutate the
// account balance inside the same transaction that settles the deposit.
import { SystemAccountService } from '../../../accounts/application/services/system-account.service';
import { AccountMapper } from '../../../accounts/infrastructure/mappers/account.mapper';
import { AccountNotFoundException } from '../../../accounts/domain/exceptions/account-not-found.exception';

/**
 * Prisma-backed implementation of `IDepositSettlementExecutor`.
 *
 * Inside a single `prisma.$transaction`:
 *   1. the Deposit row is written as SUCCESSFUL with its provider
 *      transaction id — the *unique* column claim that makes settlement
 *      exactly-once even under concurrent webhook re-delivery (the
 *      second writer hits the unique constraint / version check and the
 *      whole transaction rolls back);
 *   2. the target Account is loaded, credited via its own domain method
 *      (all invariants apply — active status, currency match), and
 *      written back conditioned on its version.
 *
 * If anything throws, Prisma rolls back both writes — a deposit can
 * never be marked settled without the credit landing, or vice versa.
 * Domain events from both aggregates are returned for post-commit
 * publication (the Ledger picks up the credit event from there).
 */
@Injectable()
export class PrismaDepositSettlementExecutor implements IDepositSettlementExecutor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemAccounts: SystemAccountService,
  ) {}

  async settle(params: {
    deposit: Deposit;
    providerTransactionId: string;
    alreadyPersisted: boolean;
  }): Promise<DepositSettlementResult> {
    const { deposit, providerTransactionId, alreadyPersisted } = params;

    deposit.complete(providerTransactionId);
    const events: DomainEvent[] = [];

    await this.prisma.$transaction(async (tx: any) => {
      const depositData = DepositMapper.toPersistence(deposit);

      if (!alreadyPersisted) {
        // Fresh aggregate (virtual-account credits are created and
        // settled in the same webhook handling) — insert claims the
        // unique providerTransactionId.
        await tx.deposit.create({ data: depositData });
      } else {
        const updated = await tx.deposit.updateMany({
          where: { id: depositData.id, version: depositData.version - 1 },
          data: depositData,
        });
        if (updated.count === 0) {
          throw new DomainException(
            `Deposit ${depositData.id} was modified concurrently; settlement aborted`,
            'CONCURRENT_MODIFICATION',
          );
        }
      }

      const accountRecord = await tx.account.findUnique({ where: { id: deposit.accountId } });
      if (!accountRecord) {
        throw new AccountNotFoundException(deposit.accountId);
      }

      const account = AccountMapper.toDomain(accountRecord);

      // The customer is credited, and Kudi's settlement float is debited by
      // the same amount in the same transaction. Previously only the credit
      // happened, so a deposit created money from nothing: the customer's
      // balance rose with no corresponding fall anywhere, and the books
      // could not be reconciled even in principle.
      //
      // The settlement account holds the float Kudi has at its payment
      // provider, which is where a real deposit's money actually sits. It
      // therefore has to be topped up as deposits draw it down — an admin
      // credit — and an InsufficientFundsException here means exactly that:
      // the float is exhausted, not that the customer did anything wrong.
      const settlement = await this.systemAccounts.settlementAccount(
        deposit.amount.getCurrency(),
      );
      settlement.debit(deposit.amount, deposit.reference.getValue());
      account.credit(deposit.amount, deposit.reference.getValue());

      for (const mutated of [settlement, account]) {
        const data = AccountMapper.toPersistence(mutated);
        const updated = await tx.account.updateMany({
          where: { id: data.id, version: data.version - 1 },
          data,
        });
        if (updated.count === 0) {
          throw new DomainException(
            `Account ${data.id} was modified concurrently; settlement aborted`,
            'CONCURRENT_MODIFICATION',
          );
        }
      }

      events.push(...settlement.pullDomainEvents());
      events.push(...account.pullDomainEvents());
    });

    events.push(...deposit.pullDomainEvents());
    return { deposit, events };
  }
}

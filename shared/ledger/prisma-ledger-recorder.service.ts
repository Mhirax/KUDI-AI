import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ILedgerRecorder, LedgerPosting, LedgerPostingLeg } from './ledger-recorder.interface';
import { UnbalancedLedgerPostingException } from './unbalanced-ledger-posting.exception';
import { LedgerEntryDirection } from './ledger-entry-direction.enum';

@Injectable()
export class PrismaLedgerRecorderService implements ILedgerRecorder {
  constructor(private readonly prisma: PrismaService) {}

  async post(posting: LedgerPosting, tx?: any): Promise<void> {
    this.assertBalanced(posting);

    const journalId = randomUUID();
    const client = tx ?? this.prisma;
    const occurredAt = new Date();

    const rows = [];
    for (const leg of posting.legs) {
      const balanceAfterMinorUnits = leg.balanceAfter
        ? leg.balanceAfter.getMinorUnits()
        : await this.computeRunningBalance(client, leg);

      rows.push({
        journalId,
        accountId: leg.accountId,
        userId: posting.userId,
        direction: leg.direction,
        amountMinorUnits: leg.amount.getMinorUnits(),
        balanceAfterMinorUnits,
        currency: leg.amount.getCurrency(),
        entryType: posting.entryType,
        reference: posting.reference,
        // Not currently used for caller-side dedup — shared/idempotency
        // already covers request-level retry safety upstream of every
        // caller here. Unique per row so it satisfies the column's own
        // constraint (see schema.prisma's LedgerEntry doc comment).
        sourceEventId: randomUUID(),
        occurredAt,
      });
    }

    await client.ledgerEntry.createMany({ data: rows });
  }

  /**
   * A synthetic system account (fee revenue, external-payout clearing)
   * has no `Account` row to read a post-mutation balance off of, but
   * `balanceAfterMinorUnits` is NOT NULL — so its running balance is
   * derived here instead, the same credit-normal convention `Account`
   * itself uses (credit() increases, debit() decreases; see that
   * entity's header comment on why — this represents the bank's own
   * liability/revenue book, not a customer-side asset ledger).
   */
  private async computeRunningBalance(client: any, leg: LedgerPostingLeg): Promise<bigint> {
    const previous = await client.ledgerEntry.findFirst({
      where: { accountId: leg.accountId },
      orderBy: { createdAt: 'desc' },
    });
    const previousBalance: bigint = previous?.balanceAfterMinorUnits ?? 0n;
    const delta =
      leg.direction === LedgerEntryDirection.CREDIT
        ? leg.amount.getMinorUnits()
        : -leg.amount.getMinorUnits();
    return previousBalance + delta;
  }

  /**
   * Debits must equal credits, per currency, before a single row is
   * written — the core double-entry invariant. Grouped by currency
   * rather than assuming one currency across all legs, since nothing
   * else in this method enforces that.
   */
  private assertBalanced(posting: LedgerPosting): void {
    const netByCurrency = new Map<string, bigint>();

    for (const leg of posting.legs) {
      const currency = leg.amount.getCurrency();
      const signedAmount =
        leg.direction === LedgerEntryDirection.DEBIT
          ? leg.amount.getMinorUnits()
          : -leg.amount.getMinorUnits();
      netByCurrency.set(currency, (netByCurrency.get(currency) ?? 0n) + signedAmount);
    }

    for (const net of netByCurrency.values()) {
      if (net !== 0n) {
        throw new UnbalancedLedgerPostingException(posting.reference);
      }
    }
  }
}

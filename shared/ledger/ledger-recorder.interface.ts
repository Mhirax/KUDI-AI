import { Money } from '../value-objects/money.vo';
import { LedgerEntryDirection } from './ledger-entry-direction.enum';
import { LedgerEntryType } from './ledger-entry-type.enum';

export interface LedgerPostingLeg {
  accountId: string;
  direction: LedgerEntryDirection;
  amount: Money;
  /**
   * Omit for a synthetic system account (shared/ledger/system-ledger-account.ts)
   * — the recorder computes its running balance from that account's own
   * prior entries instead. Always pass it for a real Account leg; the
   * caller already has the post-mutation balance for free.
   */
  balanceAfter?: Money;
}

export interface LedgerPosting {
  /** The originating Transfer's reference (or equivalent). */
  reference: string;
  narration: string;
  /** The user whose action produced this posting — every leg is tagged with it. */
  userId: string;
  entryType: LedgerEntryType;
  /** Must net to zero per currency — see `UnbalancedLedgerPostingException`. */
  legs: LedgerPostingLeg[];
}

/**
 * Port for posting a balanced double-entry journal entry. `tx` is
 * Prisma's interactive-transaction client when the posting must be
 * atomic with the account mutations that produced it (same untyped
 * `any` convention as `PrismaInternalTransferExecutor.saveAccountInTransaction`
 * — see that file's comment); omit it to post outside any enclosing
 * transaction (the external-transfer saga, which cannot use a single
 * DB transaction since it spans a call to an external provider).
 */
export interface ILedgerRecorder {
  post(posting: LedgerPosting, tx?: any): Promise<void>;
}

export const LEDGER_RECORDER = Symbol('LEDGER_RECORDER');

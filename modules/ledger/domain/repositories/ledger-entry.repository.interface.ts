import { LedgerEntry } from '../entities/ledger-entry.entity';

export interface LedgerPage {
  entries: LedgerEntry[];
  total: number;
}

export interface StatementTotals {
  /** Sum of all CREDIT entry amounts in the period, in minor units. */
  totalCreditsMinorUnits: bigint;
  /** Sum of all DEBIT entry amounts in the period, in minor units. */
  totalDebitsMinorUnits: bigint;
  entryCount: number;
}

/**
 * Port for LedgerEntry persistence. Append-only by design: there is
 * deliberately no `update` or `delete` — persisted ledger history is
 * immutable (see the LedgerEntry entity header).
 *
 * `append()` implementations must treat a `sourceEventId` uniqueness
 * violation as "already recorded" (idempotent re-delivery), not as an
 * error — and must signal it by returning `false` so event handlers
 * can log-and-skip rather than crash the event pipeline.
 */
export interface ILedgerEntryRepository {
  /** @returns `true` if appended, `false` if an entry for the same `sourceEventId` already exists. */
  append(entry: LedgerEntry): Promise<boolean>;
  findById(id: string): Promise<LedgerEntry | null>;
  findPageByAccountId(params: {
    accountId: string;
    page: number;
    limit: number;
    from?: Date;
    to?: Date;
  }): Promise<LedgerPage>;
  /** Most recent entry for the account strictly before `before` — the anchor for a statement's opening balance. */
  findLastEntryBefore(accountId: string, before: Date): Promise<LedgerEntry | null>;
  /** Most recent entry for the account at or before `atOrBefore` — the anchor for a statement's closing balance. */
  findLastEntryAtOrBefore(accountId: string, atOrBefore: Date): Promise<LedgerEntry | null>;
  sumForPeriod(accountId: string, from: Date, to: Date): Promise<StatementTotals>;
}

export const LEDGER_ENTRY_REPOSITORY = Symbol('LEDGER_ENTRY_REPOSITORY');

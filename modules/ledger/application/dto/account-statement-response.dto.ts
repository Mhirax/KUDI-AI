import { LedgerEntryResponseDto } from './ledger-entry-response.dto';

/**
 * A classic bank statement: opening balance anchored to the last entry
 * before the period, closing balance anchored to the last entry inside
 * it, plus period totals and the full entry list.
 */
export class AccountStatementResponseDto {
  accountId: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  /** Major-unit decimal strings throughout. */
  openingBalance: string;
  closingBalance: string;
  totalCredits: string;
  totalDebits: string;
  entryCount: number;
  entries: LedgerEntryResponseDto[];
}

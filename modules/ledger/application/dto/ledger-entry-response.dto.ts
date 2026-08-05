import { LedgerEntry } from '../../domain/entities/ledger-entry.entity';

export class LedgerEntryResponseDto {
  id: string;
  accountId: string;
  direction: string;
  /** Major-unit decimal string, e.g. "1999.00" — bigint minor units are never serialized directly. */
  amount: string;
  /** Account balance immediately after this entry, major-unit decimal string. */
  balanceAfter: string;
  currency: string;
  entryType: string;
  reference: string;
  occurredAt: string;

  static fromDomain(entry: LedgerEntry): LedgerEntryResponseDto {
    const props = entry.toProps();
    return {
      id: props.id,
      accountId: props.accountId,
      direction: props.direction,
      amount: props.amount.toMajorUnitsString(),
      balanceAfter: props.balanceAfter.toMajorUnitsString(),
      currency: props.amount.getCurrency(),
      entryType: props.entryType,
      reference: props.reference,
      occurredAt: props.occurredAt.toISOString(),
    };
  }
}

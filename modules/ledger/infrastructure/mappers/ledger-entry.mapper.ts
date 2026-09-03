import { LedgerEntry as PrismaLedgerEntry } from '@prisma/client';
import { LedgerEntry } from '../../domain/entities/ledger-entry.entity';
import { EntryDirection } from '../../domain/enums/entry-direction.enum';
import { LedgerEntryType } from '../../domain/enums/ledger-entry-type.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

/**
 * Translates between the Prisma persistence model (amounts stored as
 * native `BigInt` columns) and the domain `LedgerEntry` aggregate,
 * whose `Money` value objects also use `bigint` internally — no
 * precision is ever lost crossing this boundary.
 */
export class LedgerEntryMapper {
  static toDomain(record: PrismaLedgerEntry): LedgerEntry {
    const currency = record.currency as Currency;
    return LedgerEntry.reconstitute({
      id: record.id,
      accountId: record.accountId,
      userId: record.userId,
      direction: record.direction as EntryDirection,
      amount: Money.fromMinorUnits(record.amountMinorUnits, currency),
      balanceAfter: Money.fromMinorUnits(record.balanceAfterMinorUnits, currency),
      entryType: record.entryType as LedgerEntryType,
      reference: record.reference,
      journalId: record.journalId,
      sourceEventId: record.sourceEventId,
      occurredAt: record.occurredAt,
      createdAt: record.createdAt,
    });
  }

  static toPersistence(entry: LedgerEntry): PrismaLedgerEntry {
    const props = entry.toProps();
    return {
      id: props.id,
      accountId: props.accountId,
      userId: props.userId,
      direction: props.direction,
      amountMinorUnits: props.amount.getMinorUnits(),
      balanceAfterMinorUnits: props.balanceAfter.getMinorUnits(),
      currency: props.amount.getCurrency(),
      journalId: props.journalId,
      entryType: props.entryType,
      reference: props.reference,
      sourceEventId: props.sourceEventId,
      occurredAt: props.occurredAt,
      createdAt: props.createdAt,
    };
  }
}

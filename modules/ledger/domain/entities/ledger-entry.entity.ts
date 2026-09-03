import { randomUUID } from 'crypto';
import { Money } from '../../../../shared/value-objects/money.vo';
import { DomainEvent } from '../../../../shared/events/domain-event.base';
import { DomainException } from '../../../../shared/exceptions/domain.exception';
import { EntryDirection } from '../enums/entry-direction.enum';
import { LedgerEntryType } from '../enums/ledger-entry-type.enum';
import { LedgerEntryRecordedEvent } from '../events/ledger-entry-recorded.event';

/** Match the reference formats of the modules that move money, without importing them. */
const TRANSFER_REFERENCE_REGEX = /^KUDI-[A-Z0-9]{16}$/;
const DEPOSIT_REFERENCE_REGEX = /^KUDI-DEP-[A-Z0-9]{12}$/;
const BILL_REFERENCE_REGEX = /^KUDI-BILL-[A-Z0-9]{12}$/;

export interface LedgerEntryProps {
  id: string;
  /** Account whose balance this entry affected. */
  accountId: string;
  /** Owner of that account at recording time — denormalized so customer-facing history queries never need a cross-context join. */
  userId: string;
  direction: EntryDirection;
  amount: Money;
  /** The account's balance immediately after this entry was applied — as reported by the Accounts aggregate itself, never recomputed here. */
  balanceAfter: Money;
  entryType: LedgerEntryType;
  /** Business reference of the originating operation (transfer reference, admin ops reference, ...). */
  reference: string;
  /**
   * Groups the entries of a single movement. Both legs of a transfer —
   * the debit and its matching credit — carry the same journalId, which
   * is what makes this a double-entry ledger rather than a list of
   * unrelated balance changes: the entries of one journal sum to zero.
   */
  journalId: string;
  /**
   * `eventId` of the domain event this entry was projected from.
   * Doubles as the idempotency key: a unique constraint on it makes
   * re-delivery of the same event a no-op instead of a double-post.
   */
  sourceEventId: string;
  /** When the balance mutation actually happened (the event's `occurredAt`), as opposed to when this row was written. */
  occurredAt: Date;
  createdAt: Date;
}

/**
 * LedgerEntry Aggregate Root — one immutable line in an account's
 * transaction history.
 *
 * This is an append-only projection of the Accounts context's
 * credited/debited events: it is never created from an HTTP request
 * and it exposes no mutating behaviour at all — no `touch()`, no
 * `version`, no setters. Corrections are represented the way real
 * ledgers do it: by appending a compensating entry (which the Accounts
 * module produces as a fresh credit/debit), never by editing history.
 *
 * The authoritative double-entry ledger is ultimately owned by the
 * Rust `ledger-engine` (see /rust/ledger-engine); this NestJS-side
 * projection serves customer-facing history/statements and will be
 * reconciled against the engine in a later phase.
 */
export class LedgerEntry {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private readonly props: LedgerEntryProps) {}

  static record(params: {
    accountId: string;
    userId: string;
    direction: EntryDirection;
    amount: Money;
    balanceAfter: Money;
    reference: string;
    /** Defaults to the reference, so both legs of one movement group together. */
    journalId?: string;
    sourceEventId: string;
    occurredAt: Date;
  }): LedgerEntry {
    if (!params.sourceEventId) {
      throw new DomainException(
        'A ledger entry must reference its source event',
        'LEDGER_SOURCE_EVENT_REQUIRED',
      );
    }
    if (params.amount.isZero()) {
      throw new DomainException('A ledger entry must move a non-zero amount', 'LEDGER_ZERO_AMOUNT');
    }
    if (params.amount.getCurrency() !== params.balanceAfter.getCurrency()) {
      throw new DomainException(
        'Ledger entry amount and resulting balance must share a currency',
        'LEDGER_CURRENCY_MISMATCH',
      );
    }

    const entry = new LedgerEntry({
      id: randomUUID(),
      accountId: params.accountId,
      userId: params.userId,
      direction: params.direction,
      amount: params.amount,
      balanceAfter: params.balanceAfter,
      entryType: LedgerEntry.classify(params.reference),
      reference: params.reference,
      journalId: params.journalId ?? params.reference,
      sourceEventId: params.sourceEventId,
      occurredAt: params.occurredAt,
      createdAt: new Date(),
    });

    entry.domainEvents.push(
      new LedgerEntryRecordedEvent(
        entry.props.id,
        entry.props.accountId,
        entry.props.direction,
        entry.props.amount.getMinorUnits().toString(),
        entry.props.amount.getCurrency(),
        entry.props.reference,
      ),
    );

    return entry;
  }

  static reconstitute(props: LedgerEntryProps): LedgerEntry {
    return new LedgerEntry(props);
  }

  private static classify(reference: string): LedgerEntryType {
    if (TRANSFER_REFERENCE_REGEX.test(reference)) {
      return LedgerEntryType.TRANSFER;
    }
    if (DEPOSIT_REFERENCE_REGEX.test(reference)) {
      return LedgerEntryType.DEPOSIT;
    }
    if (BILL_REFERENCE_REGEX.test(reference)) {
      return LedgerEntryType.BILL_PAYMENT;
    }
    return LedgerEntryType.ADJUSTMENT;
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  get id(): string {
    return this.props.id;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get direction(): EntryDirection {
    return this.props.direction;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get balanceAfter(): Money {
    return this.props.balanceAfter;
  }

  get entryType(): LedgerEntryType {
    return this.props.entryType;
  }

  get reference(): string {
    return this.props.reference;
  }

  get journalId(): string {
    return this.props.journalId;
  }

  get sourceEventId(): string {
    return this.props.sourceEventId;
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<LedgerEntryProps> {
    return { ...this.props };
  }
}

import { randomUUID } from 'crypto';
import { AccountNumber } from '../value-objects/account-number.vo';
import { Money } from '../../../../shared/value-objects/money.vo';
import { AccountType } from '../enums/account-type.enum';
import { AccountStatus } from '../../../../shared/enums/account-status.enum';
import { Currency } from '../../../../shared/enums/currency.enum';
import { InsufficientFundsException } from '../../../../shared/exceptions/insufficient-funds.exception';
import { AccountNotActiveException } from '../exceptions/account-not-active.exception';
import { CurrencyMismatchException } from '../exceptions/currency-mismatch.exception';
import { AccountClosureNotAllowedException } from '../exceptions/account-closure-not-allowed.exception';
import { AccountOpenedEvent } from '../events/account-opened.event';
import { AccountCreditedEvent } from '../events/account-credited.event';
import { AccountDebitedEvent } from '../events/account-debited.event';
import { AccountFrozenEvent } from '../events/account-frozen.event';
import { AccountUnfrozenEvent } from '../events/account-unfrozen.event';
import { AccountActivatedEvent } from '../events/account-activated.event';
import { AccountClosedEvent } from '../events/account-closed.event';
import { DomainEvent } from '../../../../shared/events/domain-event.base';

export interface AccountProps {
  id: string;
  userId: string;
  accountNumber: AccountNumber;
  accountType: AccountType;
  currency: Currency;
  balance: Money;
  status: AccountStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Account Aggregate Root.
 *
 * Owns every invariant governing money movement in/out of a single
 * account: currency consistency, sufficient-funds enforcement, and
 * which lifecycle states permit which operations. This is the
 * NestJS-side representation of account state; the authoritative,
 * immutable transaction ledger itself is owned by the Rust
 * `ledger-engine` (see /rust/ledger-engine) — this aggregate's balance
 * is a denormalized read/write projection kept consistent with it via
 * domain events and, in a later phase, the ledger-engine's own
 * confirmation callback.
 *
 * `version` supports optimistic concurrency control: every mutation
 * increments it, and the repository's `save()` must reject a write
 * whose expected version doesn't match what's currently persisted,
 * preventing lost updates from concurrent credit/debit races.
 */
export class Account {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private props: AccountProps) {}

  static open(params: {
    userId: string;
    accountNumber: AccountNumber;
    accountType: AccountType;
    currency: Currency;
  }): Account {
    const now = new Date();
    const account = new Account({
      id: randomUUID(),
      userId: params.userId,
      accountNumber: params.accountNumber,
      accountType: params.accountType,
      currency: params.currency,
      balance: Money.zero(params.currency),
      status: AccountStatus.PENDING_VERIFICATION,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    account.addDomainEvent(
      new AccountOpenedEvent(
        account.props.id,
        account.props.userId,
        account.props.accountNumber.getValue(),
        account.props.currency,
        account.props.accountType,
      ),
    );

    return account;
  }

  static reconstitute(props: AccountProps): Account {
    return new Account(props);
  }

  /** Activates a newly-opened account once onboarding checks pass. */
  activate(): void {
    this.props.status = AccountStatus.ACTIVE;
    this.touch();
    this.addDomainEvent(new AccountActivatedEvent(this.props.id));
  }

  credit(amount: Money, reference: string): void {
    this.assertOperable();
    this.assertCurrencyMatches(amount);

    this.props.balance = this.props.balance.add(amount);
    this.touch();

    this.addDomainEvent(
      new AccountCreditedEvent(
        this.props.id,
        amount.getMinorUnits().toString(),
        amount.getCurrency(),
        reference,
        this.props.balance.getMinorUnits().toString(),
      ),
    );
  }

  debit(amount: Money, reference: string): void {
    this.assertOperable();
    this.assertCurrencyMatches(amount);

    if (!this.props.balance.isGreaterThanOrEqualTo(amount)) {
      throw new InsufficientFundsException(this.props.id);
    }

    this.props.balance = this.props.balance.subtract(amount);
    this.touch();

    this.addDomainEvent(
      new AccountDebitedEvent(
        this.props.id,
        amount.getMinorUnits().toString(),
        amount.getCurrency(),
        reference,
        this.props.balance.getMinorUnits().toString(),
      ),
    );
  }

  freeze(reason: string): void {
    this.props.status = AccountStatus.FROZEN;
    this.touch();
    this.addDomainEvent(new AccountFrozenEvent(this.props.id, reason));
  }

  unfreeze(): void {
    this.props.status = AccountStatus.ACTIVE;
    this.touch();
    this.addDomainEvent(new AccountUnfrozenEvent(this.props.id));
  }

  close(): void {
    if (!this.props.balance.isZero()) {
      throw new AccountClosureNotAllowedException(this.props.id, 'balance must be zero to close');
    }
    this.props.status = AccountStatus.CLOSED;
    this.touch();
    this.addDomainEvent(new AccountClosedEvent(this.props.id));
  }

  private assertOperable(): void {
    if (this.props.status !== AccountStatus.ACTIVE) {
      throw new AccountNotActiveException(this.props.id, this.props.status);
    }
  }

  private assertCurrencyMatches(amount: Money): void {
    if (amount.getCurrency() !== this.props.currency) {
      throw new CurrencyMismatchException(this.props.currency, amount.getCurrency());
    }
  }

  private touch(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }

  private addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get accountNumber(): AccountNumber {
    return this.props.accountNumber;
  }

  get accountType(): AccountType {
    return this.props.accountType;
  }

  get currency(): Currency {
    return this.props.currency;
  }

  get balance(): Money {
    return this.props.balance;
  }

  get status(): AccountStatus {
    return this.props.status;
  }

  get version(): number {
    return this.props.version;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toProps(): Readonly<AccountProps> {
    return { ...this.props };
  }
}

import { randomUUID } from 'crypto';
import { Money } from '../../../../shared/value-objects/money.vo';
import { DomainEvent } from '../../../../shared/events/domain-event.base';
import { TransactionStatus } from '../../../../shared/enums/transaction-status.enum';
import { DepositReference } from '../value-objects/deposit-reference.vo';
import { DepositChannel } from '../enums/deposit-channel.enum';
import { InvalidDepositStateException } from '../exceptions/invalid-deposit-state.exception';
import { DepositInitiatedEvent } from '../events/deposit-initiated.event';
import { DepositCompletedEvent } from '../events/deposit-completed.event';
import { DepositFailedEvent } from '../events/deposit-failed.event';

export interface DepositProps {
  id: string;
  reference: DepositReference;
  channel: DepositChannel;
  userId: string;
  accountId: string;
  amount: Money;
  status: TransactionStatus;
  /**
   * Flutterwave's transaction id for the settled payment. Unique at
   * the persistence layer — the idempotency key protecting against
   * webhook re-delivery double-crediting an account.
   */
  providerTransactionId: string | null;
  failureReason: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Deposit Aggregate Root — one attempt to move money *into* a Kudi
 * account from outside the platform.
 *
 * State machine: PENDING → SUCCESSFUL | FAILED (terminal, no
 * transitions out). Checkout deposits are created PENDING when the
 * customer requests a payment link and settle later via webhook;
 * virtual-account deposits are created PENDING and settled in the same
 * webhook handling, because the inbound bank transfer *is* the
 * settlement — there is no earlier initiation moment we could observe.
 *
 * The actual account credit is *not* performed here: on settlement the
 * ConfirmDepositHandler dispatches Accounts' own CreditAccountCommand,
 * so every invariant the Account aggregate enforces (active status,
 * currency match) and every downstream projection (Ledger) applies to
 * deposits automatically.
 */
export class Deposit {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private props: DepositProps) {}

  static initiate(params: {
    channel: DepositChannel;
    userId: string;
    accountId: string;
    amount: Money;
    providerTransactionId?: string;
  }): Deposit {
    const now = new Date();
    const deposit = new Deposit({
      id: randomUUID(),
      reference: DepositReference.generate(),
      channel: params.channel,
      userId: params.userId,
      accountId: params.accountId,
      amount: params.amount,
      status: TransactionStatus.PENDING,
      providerTransactionId: params.providerTransactionId ?? null,
      failureReason: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    deposit.addDomainEvent(
      new DepositInitiatedEvent(
        deposit.props.id,
        deposit.props.reference.getValue(),
        deposit.props.userId,
        deposit.props.accountId,
        deposit.props.channel,
        deposit.props.amount.getMinorUnits().toString(),
        deposit.props.amount.getCurrency(),
      ),
    );

    return deposit;
  }

  static reconstitute(props: DepositProps): Deposit {
    return new Deposit(props);
  }

  complete(providerTransactionId: string): void {
    this.assertPending('complete');
    this.props.status = TransactionStatus.SUCCESSFUL;
    this.props.providerTransactionId = providerTransactionId;
    this.touch();
    this.addDomainEvent(
      new DepositCompletedEvent(
        this.props.id,
        this.props.reference.getValue(),
        this.props.userId,
        this.props.accountId,
        this.props.amount.getMinorUnits().toString(),
        this.props.amount.getCurrency(),
      ),
    );
  }

  fail(reason: string): void {
    this.assertPending('fail');
    this.props.status = TransactionStatus.FAILED;
    this.props.failureReason = reason;
    this.touch();
    this.addDomainEvent(
      new DepositFailedEvent(
        this.props.id,
        this.props.reference.getValue(),
        this.props.userId,
        reason,
      ),
    );
  }

  isTerminal(): boolean {
    return this.props.status !== TransactionStatus.PENDING;
  }

  private assertPending(attempted: string): void {
    if (this.props.status !== TransactionStatus.PENDING) {
      throw new InvalidDepositStateException(this.props.id, attempted, this.props.status);
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
  get reference(): DepositReference {
    return this.props.reference;
  }
  get channel(): DepositChannel {
    return this.props.channel;
  }
  get userId(): string {
    return this.props.userId;
  }
  get accountId(): string {
    return this.props.accountId;
  }
  get amount(): Money {
    return this.props.amount;
  }
  get status(): TransactionStatus {
    return this.props.status;
  }
  get providerTransactionId(): string | null {
    return this.props.providerTransactionId;
  }
  get failureReason(): string | null {
    return this.props.failureReason;
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

  toProps(): Readonly<DepositProps> {
    return { ...this.props };
  }
}

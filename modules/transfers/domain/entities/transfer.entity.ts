import { randomUUID } from 'crypto';
import { TransferReference } from '../value-objects/transfer-reference.vo';
import { ExternalRecipient } from '../value-objects/external-recipient.vo';
import { Money } from '../../../../shared/value-objects/money.vo';
import { TransferType } from '../enums/transfer-type.enum';
import { TransactionStatus } from '../../../../shared/enums/transaction-status.enum';
import { InvalidTransferStateException } from '../exceptions/invalid-transfer-state.exception';
import { TransferInitiatedEvent } from '../events/transfer-initiated.event';
import { TransferCompletedEvent } from '../events/transfer-completed.event';
import { TransferFailedEvent } from '../events/transfer-failed.event';
import { TransferReversedEvent } from '../events/transfer-reversed.event';
import { DomainEvent } from '../../../../shared/events/domain-event.base';

const TERMINAL_STATUSES = new Set([
  TransactionStatus.SUCCESSFUL,
  TransactionStatus.FAILED,
  TransactionStatus.REVERSED,
  TransactionStatus.CANCELLED,
]);

export interface TransferProps {
  id: string;
  reference: TransferReference;
  type: TransferType;
  initiatorUserId: string;
  sourceAccountId: string;
  destinationAccountId: string | null;
  externalRecipient: ExternalRecipient | null;
  amount: Money;
  fee: Money;
  narration: string;
  status: TransactionStatus;
  failureReason: string | null;
  providerReference: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transfer Aggregate Root.
 *
 * Represents a single money-movement instruction — either INTERNAL
 * (synchronous, settled entirely within our own ledger projection) or
 * EXTERNAL (asynchronous, settled by Flutterwave and confirmed later
 * via webhook). This aggregate owns only the *transfer instruction's*
 * lifecycle (PENDING → PROCESSING → SUCCESSFUL/FAILED/REVERSED); the
 * actual balance mutations happen on the `Account` aggregate
 * (Accounts module) and are orchestrated together with this aggregate
 * by the application layer/infrastructure executor, not by this class.
 */
export class Transfer {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private props: TransferProps) {}

  static initiateInternal(params: {
    initiatorUserId: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amount: Money;
    fee: Money;
    narration: string;
  }): Transfer {
    const now = new Date();
    const reference = TransferReference.generate();

    const transfer = new Transfer({
      id: randomUUID(),
      reference,
      type: TransferType.INTERNAL,
      initiatorUserId: params.initiatorUserId,
      sourceAccountId: params.sourceAccountId,
      destinationAccountId: params.destinationAccountId,
      externalRecipient: null,
      amount: params.amount,
      fee: params.fee,
      narration: params.narration,
      status: TransactionStatus.PENDING,
      failureReason: null,
      providerReference: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    transfer.addDomainEvent(
      new TransferInitiatedEvent(
        transfer.props.id,
        reference.getValue(),
        TransferType.INTERNAL,
        params.sourceAccountId,
        params.amount.getMinorUnits().toString(),
        params.amount.getCurrency(),
      ),
    );

    return transfer;
  }

  static initiateExternal(params: {
    initiatorUserId: string;
    sourceAccountId: string;
    recipient: ExternalRecipient;
    amount: Money;
    fee: Money;
    narration: string;
  }): Transfer {
    const now = new Date();
    const reference = TransferReference.generate();

    const transfer = new Transfer({
      id: randomUUID(),
      reference,
      type: TransferType.EXTERNAL,
      initiatorUserId: params.initiatorUserId,
      sourceAccountId: params.sourceAccountId,
      destinationAccountId: null,
      externalRecipient: params.recipient,
      amount: params.amount,
      fee: params.fee,
      narration: params.narration,
      status: TransactionStatus.PENDING,
      failureReason: null,
      providerReference: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    transfer.addDomainEvent(
      new TransferInitiatedEvent(
        transfer.props.id,
        reference.getValue(),
        TransferType.EXTERNAL,
        params.sourceAccountId,
        params.amount.getMinorUnits().toString(),
        params.amount.getCurrency(),
      ),
    );

    return transfer;
  }

  static reconstitute(props: TransferProps): Transfer {
    return new Transfer(props);
  }

  /** Transitions PENDING → PROCESSING once dispatched to the payout provider. */
  markProcessing(providerReference?: string): void {
    this.assertNotTerminal('mark as processing');
    this.props.status = TransactionStatus.PROCESSING;
    if (providerReference) {
      this.props.providerReference = providerReference;
    }
    this.touch();
  }

  markSuccessful(): void {
    this.assertNotTerminal('mark as successful');
    this.props.status = TransactionStatus.SUCCESSFUL;
    this.touch();
    this.addDomainEvent(new TransferCompletedEvent(this.props.id, this.props.reference.getValue()));
  }

  markFailed(reason: string): void {
    this.assertNotTerminal('mark as failed');
    this.props.status = TransactionStatus.FAILED;
    this.props.failureReason = reason;
    this.touch();
    this.addDomainEvent(
      new TransferFailedEvent(this.props.id, this.props.reference.getValue(), reason),
    );
  }

  /**
   * Marks the transfer REVERSED after a compensating credit has been
   * applied to the source account (saga compensation for an external
   * payout that failed after the initial debit).
   */
  markReversed(reason: string): void {
    this.assertNotTerminal('mark as reversed');
    this.props.status = TransactionStatus.REVERSED;
    this.props.failureReason = reason;
    this.touch();
    this.addDomainEvent(new TransferReversedEvent(this.props.id, this.props.reference.getValue()));
  }

  private assertNotTerminal(attemptedAction: string): void {
    if (TERMINAL_STATUSES.has(this.props.status)) {
      throw new InvalidTransferStateException(this.props.id, this.props.status, attemptedAction);
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

  get reference(): TransferReference {
    return this.props.reference;
  }

  get type(): TransferType {
    return this.props.type;
  }

  get initiatorUserId(): string {
    return this.props.initiatorUserId;
  }

  get sourceAccountId(): string {
    return this.props.sourceAccountId;
  }

  get destinationAccountId(): string | null {
    return this.props.destinationAccountId;
  }

  get externalRecipient(): ExternalRecipient | null {
    return this.props.externalRecipient;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get fee(): Money {
    return this.props.fee;
  }

  get status(): TransactionStatus {
    return this.props.status;
  }

  get providerReference(): string | null {
    return this.props.providerReference;
  }

  get version(): number {
    return this.props.version;
  }

  toProps(): Readonly<TransferProps> {
    return { ...this.props };
  }
}

import { randomUUID } from 'crypto';
import { Money } from '../../../../shared/value-objects/money.vo';
import { DomainEvent } from '../../../../shared/events/domain-event.base';
import { TransactionStatus } from '../../../../shared/enums/transaction-status.enum';
import { BillReference } from '../value-objects/bill-reference.vo';
import { BillCategory } from '../enums/bill-category.enum';
import { InvalidBillPaymentStateException } from '../exceptions/invalid-bill-payment-state.exception';
import { BillPaymentInitiatedEvent } from '../events/bill-payment-initiated.event';
import { BillPaymentCompletedEvent } from '../events/bill-payment-completed.event';
import { BillPaymentFailedEvent } from '../events/bill-payment-failed.event';
import { BillPaymentReversedEvent } from '../events/bill-payment-reversed.event';

export interface BillPaymentProps {
  id: string;
  reference: BillReference;
  userId: string;
  accountId: string;
  category: BillCategory;
  billerCode: string;
  itemCode: string;
  billerName: string;
  /** Phone number / meter number / smartcard number, per category. */
  customerIdentifier: string;
  amount: Money;
  fee: Money;
  status: TransactionStatus;
  providerReference: string | null;
  /** Provider-issued value token (e.g. prepaid electricity token). */
  valueToken: string | null;
  failureReason: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * BillPayment Aggregate Root — one attempt to pay a bill (airtime,
 * data, electricity, TV, internet) from a Kudi wallet.
 *
 * State machine (the saga's ratchet):
 *   PENDING → PROCESSING → SUCCESSFUL | FAILED
 *   PENDING/PROCESSING → REVERSED (funds returned to the wallet)
 *
 * REVERSED is distinct from FAILED deliberately, exactly as in the
 * Transfers module: REVERSED tells the customer "your money came
 * back"; FAILED alone would leave that ambiguous.
 */
export class BillPayment {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private props: BillPaymentProps) {}

  static initiate(params: {
    userId: string;
    accountId: string;
    category: BillCategory;
    billerCode: string;
    itemCode: string;
    billerName: string;
    customerIdentifier: string;
    amount: Money;
    fee: Money;
  }): BillPayment {
    const now = new Date();
    const billPayment = new BillPayment({
      id: randomUUID(),
      reference: BillReference.generate(),
      userId: params.userId,
      accountId: params.accountId,
      category: params.category,
      billerCode: params.billerCode,
      itemCode: params.itemCode,
      billerName: params.billerName,
      customerIdentifier: params.customerIdentifier,
      amount: params.amount,
      fee: params.fee,
      status: TransactionStatus.PENDING,
      providerReference: null,
      valueToken: null,
      failureReason: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    billPayment.addDomainEvent(
      new BillPaymentInitiatedEvent(
        billPayment.props.id,
        billPayment.props.reference.getValue(),
        billPayment.props.userId,
        billPayment.props.accountId,
        billPayment.props.category,
        billPayment.props.billerCode,
        billPayment.props.customerIdentifier,
        billPayment.props.amount.getMinorUnits().toString(),
        billPayment.props.amount.getCurrency(),
      ),
    );

    return billPayment;
  }

  static reconstitute(props: BillPaymentProps): BillPayment {
    return new BillPayment(props);
  }

  markProcessing(providerReference: string): void {
    this.assertStatus('mark processing', [TransactionStatus.PENDING]);
    this.props.status = TransactionStatus.PROCESSING;
    this.props.providerReference = providerReference;
    this.touch();
  }

  markSuccessful(providerReference: string, valueToken: string | null): void {
    this.assertStatus('complete', [TransactionStatus.PENDING, TransactionStatus.PROCESSING]);
    this.props.status = TransactionStatus.SUCCESSFUL;
    this.props.providerReference = providerReference;
    this.props.valueToken = valueToken;
    this.touch();
    this.addDomainEvent(
      new BillPaymentCompletedEvent(
        this.props.id,
        this.props.reference.getValue(),
        this.props.userId,
        this.props.category,
        this.props.amount.getMinorUnits().toString(),
        this.props.amount.getCurrency(),
        valueToken,
      ),
    );
  }

  markFailed(reason: string): void {
    this.assertStatus('fail', [TransactionStatus.PENDING, TransactionStatus.PROCESSING]);
    this.props.status = TransactionStatus.FAILED;
    this.props.failureReason = reason;
    this.touch();
    this.addDomainEvent(
      new BillPaymentFailedEvent(
        this.props.id,
        this.props.reference.getValue(),
        this.props.userId,
        reason,
      ),
    );
  }

  markReversed(reason: string): void {
    this.assertStatus('reverse', [TransactionStatus.PENDING, TransactionStatus.PROCESSING]);
    this.props.status = TransactionStatus.REVERSED;
    this.props.failureReason = reason;
    this.touch();
    this.addDomainEvent(
      new BillPaymentReversedEvent(
        this.props.id,
        this.props.reference.getValue(),
        this.props.userId,
        reason,
      ),
    );
  }

  isTerminal(): boolean {
    return (
      this.props.status !== TransactionStatus.PENDING &&
      this.props.status !== TransactionStatus.PROCESSING
    );
  }

  totalDebit(): Money {
    return this.props.amount.add(this.props.fee);
  }

  private assertStatus(attempted: string, allowed: TransactionStatus[]): void {
    if (!allowed.includes(this.props.status)) {
      throw new InvalidBillPaymentStateException(this.props.id, attempted, this.props.status);
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
  get reference(): BillReference {
    return this.props.reference;
  }
  get userId(): string {
    return this.props.userId;
  }
  get accountId(): string {
    return this.props.accountId;
  }
  get category(): BillCategory {
    return this.props.category;
  }
  get billerCode(): string {
    return this.props.billerCode;
  }
  get itemCode(): string {
    return this.props.itemCode;
  }
  get billerName(): string {
    return this.props.billerName;
  }
  get customerIdentifier(): string {
    return this.props.customerIdentifier;
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
  get valueToken(): string | null {
    return this.props.valueToken;
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

  toProps(): Readonly<BillPaymentProps> {
    return { ...this.props };
  }
}

import { randomUUID } from 'crypto';
import { DomainEvent } from '../../../../shared/events/domain-event.base';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';
import { SavingsGoalStatus } from '../enums/savings-goal-status.enum';
import { InvalidSavingsGoalStateException } from '../exceptions/invalid-savings-goal-state.exception';
import { SavingsGoalCreatedEvent } from '../events/savings-goal-created.event';
import { SavingsGoalFundedEvent } from '../events/savings-goal-funded.event';
import { SavingsGoalWithdrawnEvent } from '../events/savings-goal-withdrawn.event';
import { SavingsGoalClosedEvent } from '../events/savings-goal-closed.event';

export interface SavingsGoalProps {
  id: string;
  userId: string;
  savingsAccountId: string;
  sourceAccountId: string;
  name: string;
  /** null = open-ended flexible savings, no fixed target. */
  targetAmount: Money | null;
  currency: Currency;
  status: SavingsGoalStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SavingsGoal Aggregate Root — metadata and lifecycle for one savings
 * goal. Deliberately does NOT hold a balance itself: the actual funds
 * live on a dedicated Account (accountType=SAVINGS), opened via the
 * Accounts module's own OpenAccountCommand and moved with its
 * CreditAccountCommand/DebitAccountCommand — the same primitives every
 * other bounded context uses, so Ledger projection and optimistic
 * concurrency on the money itself are inherited for free rather than
 * reimplemented here (see CreateSavingsGoalHandler / DepositToSavingsHandler).
 * This aggregate's own events (Funded/Withdrawn/Closed) exist for the
 * Savings module's own history; the money-movement events themselves
 * are published by Account.credit()/debit() as normal and projected
 * into the Ledger exactly like any other transaction.
 */
export class SavingsGoal {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private props: SavingsGoalProps) {}

  static create(params: {
    userId: string;
    savingsAccountId: string;
    sourceAccountId: string;
    name: string;
    targetAmount: Money | null;
    currency: Currency;
  }): SavingsGoal {
    const now = new Date();
    const goal = new SavingsGoal({
      id: randomUUID(),
      userId: params.userId,
      savingsAccountId: params.savingsAccountId,
      sourceAccountId: params.sourceAccountId,
      name: params.name,
      targetAmount: params.targetAmount,
      currency: params.currency,
      status: SavingsGoalStatus.ACTIVE,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    goal.addDomainEvent(
      new SavingsGoalCreatedEvent(goal.props.id, goal.props.userId, goal.props.name),
    );

    return goal;
  }

  static reconstitute(props: SavingsGoalProps): SavingsGoal {
    return new SavingsGoal(props);
  }

  /** Records that a deposit was made — call after the underlying Account credit succeeds. */
  recordDeposit(amount: Money): void {
    this.assertActive('deposit into');
    this.touch();
    this.addDomainEvent(
      new SavingsGoalFundedEvent(
        this.props.id,
        this.props.userId,
        amount.getMinorUnits().toString(),
        amount.getCurrency(),
      ),
    );
  }

  /** Records that a withdrawal was made — call after the underlying Account debit succeeds. */
  recordWithdrawal(amount: Money): void {
    this.assertActive('withdraw from');
    this.touch();
    this.addDomainEvent(
      new SavingsGoalWithdrawnEvent(
        this.props.id,
        this.props.userId,
        amount.getMinorUnits().toString(),
        amount.getCurrency(),
      ),
    );
  }

  close(): void {
    this.assertActive('close');
    this.props.status = SavingsGoalStatus.CLOSED;
    this.touch();
    this.addDomainEvent(new SavingsGoalClosedEvent(this.props.id, this.props.userId));
  }

  private assertActive(attempted: string): void {
    if (this.props.status !== SavingsGoalStatus.ACTIVE) {
      throw new InvalidSavingsGoalStateException(this.props.id, attempted, this.props.status);
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
  get savingsAccountId(): string {
    return this.props.savingsAccountId;
  }
  get sourceAccountId(): string {
    return this.props.sourceAccountId;
  }
  get name(): string {
    return this.props.name;
  }
  get targetAmount(): Money | null {
    return this.props.targetAmount;
  }
  get currency(): Currency {
    return this.props.currency;
  }
  get status(): SavingsGoalStatus {
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

  toProps(): Readonly<SavingsGoalProps> {
    return { ...this.props };
  }
}

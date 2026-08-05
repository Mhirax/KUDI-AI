import { randomUUID } from 'crypto';
import { DomainEvent } from '../../../../shared/events/domain-event.base';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';
import { CardType } from '../enums/card-type.enum';
import { CardStatus } from '../enums/card-status.enum';
import { InvalidCardStateException } from '../exceptions/invalid-card-state.exception';
import { VirtualCardCreatedEvent } from '../events/virtual-card-created.event';
import { PhysicalCardRequestedEvent } from '../events/physical-card-requested.event';
import { CardFundedEvent } from '../events/card-funded.event';
import { CardFrozenEvent } from '../events/card-frozen.event';
import { CardUnfrozenEvent } from '../events/card-unfrozen.event';
import { CardTerminatedEvent } from '../events/card-terminated.event';

export interface CardProps {
  id: string;
  userId: string;
  accountId: string;
  type: CardType;
  status: CardStatus;
  providerCardId: string | null;
  last4: string | null;
  expiryMonth: string | null;
  expiryYear: string | null;
  brand: string | null;
  /** The card's own spendable balance — separate from the linked account's balance until funded. */
  balance: Money;
  currency: Currency;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Card Aggregate Root — virtual and physical debit cards linked to a
 * platform Account.
 *
 * State machine:
 *   PENDING → ACTIVE → FROZEN ⇄ ACTIVE
 *   PENDING/ACTIVE/FROZEN → TERMINATED
 *
 * Virtual cards are issued synchronously against Flutterwave's
 * Issuing API and move straight to ACTIVE (see
 * CreateVirtualCardHandler). Physical cards stay PENDING — physical
 * fulfillment (printing, embossing, courier dispatch) is an offline
 * process, not a synchronous API call (see module README).
 *
 * The card's `balance` is its own spendable pool, separate from the
 * linked Account's balance, funded explicitly via `fund()`
 * (FundCardHandler debits the Account first through
 * DebitAccountCommand, then credits the card here) — mirroring how
 * SavingsGoal keeps its own balance via a dedicated backing Account,
 * except a card's balance lives on the Card aggregate itself rather
 * than a second Account, since card spend is provider-side, not
 * ledger-side, in this phase.
 */
export class Card {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private props: CardProps) {}

  static createVirtual(params: { userId: string; accountId: string; currency: Currency }): Card {
    const now = new Date();
    const card = new Card({
      id: randomUUID(),
      userId: params.userId,
      accountId: params.accountId,
      type: CardType.VIRTUAL,
      status: CardStatus.PENDING,
      providerCardId: null,
      last4: null,
      expiryMonth: null,
      expiryYear: null,
      brand: null,
      balance: Money.zero(params.currency),
      currency: params.currency,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    card.addDomainEvent(
      new VirtualCardCreatedEvent(card.props.id, card.props.userId, card.props.accountId),
    );

    return card;
  }

  static requestPhysical(params: { userId: string; accountId: string; currency: Currency }): Card {
    const now = new Date();
    const card = new Card({
      id: randomUUID(),
      userId: params.userId,
      accountId: params.accountId,
      type: CardType.PHYSICAL,
      status: CardStatus.PENDING,
      providerCardId: null,
      last4: null,
      expiryMonth: null,
      expiryYear: null,
      brand: null,
      balance: Money.zero(params.currency),
      currency: params.currency,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    card.addDomainEvent(
      new PhysicalCardRequestedEvent(card.props.id, card.props.userId, card.props.accountId),
    );

    return card;
  }

  static reconstitute(props: CardProps): Card {
    return new Card(props);
  }

  /**
   * Attaches provider-issued card details and activates a PENDING
   * card. For virtual cards this runs immediately after the
   * synchronous Flutterwave create call (see
   * CreateVirtualCardHandler); physical cards are activated later by
   * an ops workflow not built in this phase.
   */
  activate(details: {
    providerCardId: string;
    last4: string;
    expiryMonth: string;
    expiryYear: string;
    brand: string;
  }): void {
    this.assertStatus('activate', [CardStatus.PENDING]);
    this.props.status = CardStatus.ACTIVE;
    this.props.providerCardId = details.providerCardId;
    this.props.last4 = details.last4;
    this.props.expiryMonth = details.expiryMonth;
    this.props.expiryYear = details.expiryYear;
    this.props.brand = details.brand;
    this.touch();
  }

  fund(amount: Money): void {
    this.assertStatus('fund', [CardStatus.ACTIVE]);
    this.props.balance = this.props.balance.add(amount);
    this.touch();
    this.addDomainEvent(
      new CardFundedEvent(
        this.props.id,
        this.props.userId,
        amount.getMinorUnits().toString(),
        this.props.currency,
      ),
    );
  }

  freeze(): void {
    this.assertStatus('freeze', [CardStatus.ACTIVE]);
    this.props.status = CardStatus.FROZEN;
    this.touch();
    this.addDomainEvent(new CardFrozenEvent(this.props.id, this.props.userId));
  }

  unfreeze(): void {
    this.assertStatus('unfreeze', [CardStatus.FROZEN]);
    this.props.status = CardStatus.ACTIVE;
    this.touch();
    this.addDomainEvent(new CardUnfrozenEvent(this.props.id, this.props.userId));
  }

  /**
   * Terminates the card and returns the balance that must be swept
   * back to the linked Account — the handler is responsible for
   * actually crediting it via CreditAccountCommand, since Money
   * movement never happens inside this aggregate (see module README).
   */
  terminate(): Money {
    this.assertStatus('terminate', [CardStatus.PENDING, CardStatus.ACTIVE, CardStatus.FROZEN]);
    const sweptAmount = this.props.balance;
    this.props.status = CardStatus.TERMINATED;
    this.props.balance = Money.zero(this.props.currency);
    this.touch();
    this.addDomainEvent(
      new CardTerminatedEvent(
        this.props.id,
        this.props.userId,
        this.props.accountId,
        sweptAmount.getMinorUnits().toString(),
        this.props.currency,
      ),
    );
    return sweptAmount;
  }

  private assertStatus(attempted: string, allowed: CardStatus[]): void {
    if (!allowed.includes(this.props.status)) {
      throw new InvalidCardStateException(this.props.id, attempted, this.props.status);
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
  get accountId(): string {
    return this.props.accountId;
  }
  get type(): CardType {
    return this.props.type;
  }
  get status(): CardStatus {
    return this.props.status;
  }
  get providerCardId(): string | null {
    return this.props.providerCardId;
  }
  get balance(): Money {
    return this.props.balance;
  }
  get currency(): Currency {
    return this.props.currency;
  }
  get version(): number {
    return this.props.version;
  }

  toProps(): Readonly<CardProps> {
    return { ...this.props };
  }
}

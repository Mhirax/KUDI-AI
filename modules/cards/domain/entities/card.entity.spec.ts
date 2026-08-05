import { Card } from './card.entity';
import { CardType } from '../enums/card-type.enum';
import { CardStatus } from '../enums/card-status.enum';
import { InvalidCardStateException } from '../exceptions/invalid-card-state.exception';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

const issuedDetails = {
  providerCardId: 'flw-card-1',
  last4: '4242',
  expiryMonth: '09',
  expiryYear: '29',
  brand: 'VERVE',
};

function createVirtualCard(): Card {
  return Card.createVirtual({ userId: 'user-1', accountId: 'account-1', currency: Currency.NGN });
}

describe('Card aggregate', () => {
  it('creates a virtual card PENDING and emits VirtualCardCreatedEvent', () => {
    const card = createVirtualCard();

    expect(card.type).toBe(CardType.VIRTUAL);
    expect(card.status).toBe(CardStatus.PENDING);
    expect(card.pullDomainEvents()[0].eventName).toBe('cards.card.virtual-created');
  });

  it('requests a physical card PENDING and emits PhysicalCardRequestedEvent, with no provider call implied', () => {
    const card = Card.requestPhysical({
      userId: 'user-1',
      accountId: 'account-1',
      currency: Currency.NGN,
    });

    expect(card.type).toBe(CardType.PHYSICAL);
    expect(card.status).toBe(CardStatus.PENDING);
    expect(card.providerCardId).toBeNull();
    expect(card.pullDomainEvents()[0].eventName).toBe('cards.card.physical-requested');
  });

  it('activates a PENDING card with provider-issued details', () => {
    const card = createVirtualCard();
    card.pullDomainEvents();

    card.activate(issuedDetails);

    expect(card.status).toBe(CardStatus.ACTIVE);
    expect(card.providerCardId).toBe('flw-card-1');
  });

  it('funds an ACTIVE card and emits CardFundedEvent', () => {
    const card = createVirtualCard();
    card.activate(issuedDetails);
    card.pullDomainEvents();

    card.fund(Money.fromDecimalString('2000.00', Currency.NGN));

    expect(card.balance.toMajorUnitsString()).toBe('2000.00');
    expect(card.pullDomainEvents()[0].eventName).toBe('cards.card.funded');
  });

  it('refuses to fund a PENDING (not yet activated) card', () => {
    const card = createVirtualCard();
    expect(() => card.fund(Money.fromDecimalString('100.00', Currency.NGN))).toThrow(
      InvalidCardStateException,
    );
  });

  it('freezes an ACTIVE card and unfreezes it back to ACTIVE', () => {
    const card = createVirtualCard();
    card.activate(issuedDetails);
    card.pullDomainEvents();

    card.freeze();
    expect(card.status).toBe(CardStatus.FROZEN);

    card.unfreeze();
    expect(card.status).toBe(CardStatus.ACTIVE);
  });

  it('terminates a funded card, zeroing its balance and returning the swept amount', () => {
    const card = createVirtualCard();
    card.activate(issuedDetails);
    card.fund(Money.fromDecimalString('1500.00', Currency.NGN));
    card.pullDomainEvents();

    const swept = card.terminate();

    expect(swept.toMajorUnitsString()).toBe('1500.00');
    expect(card.balance.toMajorUnitsString()).toBe('0.00');
    expect(card.status).toBe(CardStatus.TERMINATED);
    expect(card.pullDomainEvents()[0].eventName).toBe('cards.card.terminated');
  });

  it('rejects any action on a TERMINATED card', () => {
    const card = createVirtualCard();
    card.activate(issuedDetails);
    card.terminate();

    expect(() => card.freeze()).toThrow(InvalidCardStateException);
    expect(() => card.fund(Money.fromDecimalString('10.00', Currency.NGN))).toThrow(
      InvalidCardStateException,
    );
    expect(() => card.terminate()).toThrow(InvalidCardStateException);
  });
});

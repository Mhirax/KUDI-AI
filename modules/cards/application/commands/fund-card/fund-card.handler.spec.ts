import { CommandBus, EventBus } from '@nestjs/cqrs';
import { ForbiddenException } from '@nestjs/common';
import { FundCardHandler } from './fund-card.handler';
import { FundCardCommand } from './fund-card.command';
import { ICardRepository } from '../../../domain/repositories/card.repository.interface';
import { ICardIssuer } from '../../../domain/services/card-issuer.interface';
import { Card } from '../../../domain/entities/card.entity';
import { CardNotFoundException } from '../../../domain/exceptions/card-not-found.exception';
import { DebitAccountCommand } from '../../../../accounts/application/commands/debit-account/debit-account.command';
import { Currency } from '../../../../../shared/enums/currency.enum';

function activeCard(): Card {
  const card = Card.createVirtual({
    userId: 'user-1',
    accountId: 'account-1',
    currency: Currency.NGN,
  });
  card.pullDomainEvents();
  card.activate({
    providerCardId: 'flw-card-1',
    last4: '4242',
    expiryMonth: '09',
    expiryYear: '29',
    brand: 'VERVE',
  });
  card.pullDomainEvents();
  return card;
}

describe('FundCardHandler', () => {
  let cardRepository: jest.Mocked<ICardRepository>;
  let cardIssuer: jest.Mocked<ICardIssuer>;
  let commandBus: jest.Mocked<Pick<CommandBus, 'execute'>>;
  let eventBus: jest.Mocked<Pick<EventBus, 'publish'>>;
  let handler: FundCardHandler;
  let card: Card;

  beforeEach(() => {
    card = activeCard();
    cardRepository = {
      findById: jest.fn().mockResolvedValue(card),
      findByProviderCardId: jest.fn(),
      findAllByUserId: jest.fn(),
      save: jest.fn(),
    };
    cardIssuer = {
      issueVirtualCard: jest.fn(),
      fundCard: jest.fn().mockResolvedValue(undefined),
      blockCard: jest.fn(),
      unblockCard: jest.fn(),
      terminateCard: jest.fn(),
    };
    commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    eventBus = { publish: jest.fn() };
    handler = new FundCardHandler(
      cardRepository,
      cardIssuer,
      commandBus as unknown as CommandBus,
      eventBus as unknown as EventBus,
    );
  });

  it('debits the linked account, funds the provider, and credits the card balance', async () => {
    const response = await handler.execute(new FundCardCommand('user-1', 'card-1', '2500.00'));

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DebitAccountCommand));
    const debitCommand = commandBus.execute.mock.calls[0][0] as DebitAccountCommand;
    expect(debitCommand.accountId).toBe('account-1');
    expect(cardIssuer.fundCard).toHaveBeenCalledWith('flw-card-1', expect.anything());
    expect(response.balance).toBe('2500.00');
    expect(cardRepository.save).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('throws CardNotFoundException when the card does not exist', async () => {
    cardRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new FundCardCommand('user-1', 'missing', '100.00')),
    ).rejects.toThrow(CardNotFoundException);
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it("refuses to fund someone else's card", async () => {
    await expect(
      handler.execute(new FundCardCommand('intruder', 'card-1', '100.00')),
    ).rejects.toThrow(ForbiddenException);
    expect(commandBus.execute).not.toHaveBeenCalled();
  });
});

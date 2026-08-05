import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { FundCardCommand } from './fund-card.command';
import {
  CARD_REPOSITORY,
  ICardRepository,
} from '../../../domain/repositories/card.repository.interface';
import { CARD_ISSUER, ICardIssuer } from '../../../domain/services/card-issuer.interface';
import { CardNotFoundException } from '../../../domain/exceptions/card-not-found.exception';
import { CardResponseDto } from '../../dto/card-response.dto';
import { Money } from '../../../../../shared/value-objects/money.vo';

// Cross-module dependency on Accounts' own DebitAccountCommand — the
// actual money movement (pulling from the linked account's wallet
// balance into the card's own spendable balance), reused rather than
// reimplemented. Mirrors DepositToSavingsHandler / RepayLoanHandler.
import { DebitAccountCommand } from '../../../../accounts/application/commands/debit-account/debit-account.command';

/**
 * Use case: fund a card from its linked account. Debits the Account
 * first (Account.debit() enforces sufficient-funds), then credits the
 * card's own balance and pushes the funding to the provider so the
 * card can actually be spent against it.
 */
@Injectable()
@CommandHandler(FundCardCommand)
export class FundCardHandler implements ICommandHandler<FundCardCommand, CardResponseDto> {
  constructor(
    @Inject(CARD_REPOSITORY) private readonly cardRepository: ICardRepository,
    @Inject(CARD_ISSUER) private readonly cardIssuer: ICardIssuer,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: FundCardCommand): Promise<CardResponseDto> {
    const card = await this.cardRepository.findById(command.cardId);
    if (!card) {
      throw new CardNotFoundException(command.cardId);
    }
    if (card.userId !== command.userId) {
      throw new ForbiddenException('You may only fund your own card');
    }

    const reference = `${card.id}-FUND-${Date.now()}`;
    await this.commandBus.execute(
      new DebitAccountCommand(card.accountId, command.amount, card.currency, reference),
    );

    const amount = Money.fromDecimalString(command.amount, card.currency);
    if (card.providerCardId) {
      await this.cardIssuer.fundCard(card.providerCardId, amount);
    }
    card.fund(amount);

    await this.cardRepository.save(card);
    card.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return CardResponseDto.fromDomain(card);
  }
}

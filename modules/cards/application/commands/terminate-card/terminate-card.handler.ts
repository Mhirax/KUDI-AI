import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { TerminateCardCommand } from './terminate-card.command';
import {
  CARD_REPOSITORY,
  ICardRepository,
} from '../../../domain/repositories/card.repository.interface';
import { CARD_ISSUER, ICardIssuer } from '../../../domain/services/card-issuer.interface';
import { CardNotFoundException } from '../../../domain/exceptions/card-not-found.exception';
import { CardResponseDto } from '../../dto/card-response.dto';

// Cross-module dependency on Accounts' own CreditAccountCommand — used
// to sweep any remaining card balance back to the linked account
// before the card is permanently closed out.
import { CreditAccountCommand } from '../../../../accounts/application/commands/credit-account/credit-account.command';

/**
 * Use case: permanently terminate a card. Calls the provider first,
 * then sweeps any remaining card balance back to the linked account
 * via Accounts' own CreditAccountCommand so no funds are stranded on a
 * dead card — the entity's terminate() zeroes the card's balance and
 * hands the swept amount back to this handler to actually move.
 */
@Injectable()
@CommandHandler(TerminateCardCommand)
export class TerminateCardHandler implements ICommandHandler<
  TerminateCardCommand,
  CardResponseDto
> {
  constructor(
    @Inject(CARD_REPOSITORY) private readonly cardRepository: ICardRepository,
    @Inject(CARD_ISSUER) private readonly cardIssuer: ICardIssuer,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: TerminateCardCommand): Promise<CardResponseDto> {
    const card = await this.cardRepository.findById(command.cardId);
    if (!card) {
      throw new CardNotFoundException(command.cardId);
    }
    if (!command.isAdmin && card.userId !== command.userId) {
      throw new ForbiddenException('You may only terminate your own card');
    }

    if (card.providerCardId) {
      await this.cardIssuer.terminateCard(card.providerCardId);
    }
    const sweptAmount = card.terminate();

    await this.cardRepository.save(card);

    if (!sweptAmount.isZero()) {
      const reference = `${card.id}-TERMINATE-SWEEP-${Date.now()}`;
      await this.commandBus.execute(
        new CreditAccountCommand(
          card.accountId,
          sweptAmount.toMajorUnitsString(),
          card.currency,
          reference,
        ),
      );
    }

    card.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return CardResponseDto.fromDomain(card);
  }
}

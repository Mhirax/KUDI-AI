import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { FreezeCardCommand } from './freeze-card.command';
import {
  CARD_REPOSITORY,
  ICardRepository,
} from '../../../domain/repositories/card.repository.interface';
import { CARD_ISSUER, ICardIssuer } from '../../../domain/services/card-issuer.interface';
import { CardNotFoundException } from '../../../domain/exceptions/card-not-found.exception';
import { CardResponseDto } from '../../dto/card-response.dto';

/**
 * Use case: freeze an active card. Calls Flutterwave's block endpoint
 * first (provider is the source of truth for whether the card can
 * actually be used), then updates local state — if the provider call
 * fails, the local card is left ACTIVE rather than silently frozen.
 */
@Injectable()
@CommandHandler(FreezeCardCommand)
export class FreezeCardHandler implements ICommandHandler<FreezeCardCommand, CardResponseDto> {
  constructor(
    @Inject(CARD_REPOSITORY) private readonly cardRepository: ICardRepository,
    @Inject(CARD_ISSUER) private readonly cardIssuer: ICardIssuer,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: FreezeCardCommand): Promise<CardResponseDto> {
    const card = await this.cardRepository.findById(command.cardId);
    if (!card) {
      throw new CardNotFoundException(command.cardId);
    }
    if (!command.isAdmin && card.userId !== command.userId) {
      throw new ForbiddenException('You may only freeze your own card');
    }

    if (card.providerCardId) {
      await this.cardIssuer.blockCard(card.providerCardId);
    }
    card.freeze();

    await this.cardRepository.save(card);
    card.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return CardResponseDto.fromDomain(card);
  }
}

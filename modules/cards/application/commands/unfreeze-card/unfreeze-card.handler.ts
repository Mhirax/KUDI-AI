import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UnfreezeCardCommand } from './unfreeze-card.command';
import {
  CARD_REPOSITORY,
  ICardRepository,
} from '../../../domain/repositories/card.repository.interface';
import { CARD_ISSUER, ICardIssuer } from '../../../domain/services/card-issuer.interface';
import { CardNotFoundException } from '../../../domain/exceptions/card-not-found.exception';
import { CardResponseDto } from '../../dto/card-response.dto';

@Injectable()
@CommandHandler(UnfreezeCardCommand)
export class UnfreezeCardHandler implements ICommandHandler<UnfreezeCardCommand, CardResponseDto> {
  constructor(
    @Inject(CARD_REPOSITORY) private readonly cardRepository: ICardRepository,
    @Inject(CARD_ISSUER) private readonly cardIssuer: ICardIssuer,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UnfreezeCardCommand): Promise<CardResponseDto> {
    const card = await this.cardRepository.findById(command.cardId);
    if (!card) {
      throw new CardNotFoundException(command.cardId);
    }
    if (!command.isAdmin && card.userId !== command.userId) {
      throw new ForbiddenException('You may only unfreeze your own card');
    }

    if (card.providerCardId) {
      await this.cardIssuer.unblockCard(card.providerCardId);
    }
    card.unfreeze();

    await this.cardRepository.save(card);
    card.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return CardResponseDto.fromDomain(card);
  }
}

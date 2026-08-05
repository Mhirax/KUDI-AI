import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCardByIdQuery } from './get-card-by-id.query';
import {
  CARD_REPOSITORY,
  ICardRepository,
} from '../../../domain/repositories/card.repository.interface';
import { CardNotFoundException } from '../../../domain/exceptions/card-not-found.exception';
import { CardResponseDto } from '../../dto/card-response.dto';

@Injectable()
@QueryHandler(GetCardByIdQuery)
export class GetCardByIdHandler implements IQueryHandler<GetCardByIdQuery, CardResponseDto> {
  constructor(@Inject(CARD_REPOSITORY) private readonly cardRepository: ICardRepository) {}

  async execute(query: GetCardByIdQuery): Promise<CardResponseDto> {
    const card = await this.cardRepository.findById(query.cardId);
    if (!card) {
      throw new CardNotFoundException(query.cardId);
    }
    if (!query.isAdmin && card.userId !== query.requesterUserId) {
      throw new ForbiddenException('You may only view your own card');
    }
    return CardResponseDto.fromDomain(card);
  }
}

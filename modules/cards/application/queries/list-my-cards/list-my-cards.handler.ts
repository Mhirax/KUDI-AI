import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListMyCardsQuery } from './list-my-cards.query';
import {
  CARD_REPOSITORY,
  ICardRepository,
} from '../../../domain/repositories/card.repository.interface';
import { CardResponseDto } from '../../dto/card-response.dto';

@Injectable()
@QueryHandler(ListMyCardsQuery)
export class ListMyCardsHandler implements IQueryHandler<ListMyCardsQuery, CardResponseDto[]> {
  constructor(@Inject(CARD_REPOSITORY) private readonly cardRepository: ICardRepository) {}

  async execute(query: ListMyCardsQuery): Promise<CardResponseDto[]> {
    const cards = await this.cardRepository.findAllByUserId(query.userId);
    return cards.map((card) => CardResponseDto.fromDomain(card));
  }
}

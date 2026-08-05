import { Card } from '../entities/card.entity';

export interface ICardRepository {
  findById(id: string): Promise<Card | null>;
  findByProviderCardId(providerCardId: string): Promise<Card | null>;
  findAllByUserId(userId: string): Promise<Card[]>;
  save(card: Card): Promise<void>;
}

export const CARD_REPOSITORY = Symbol('CARD_REPOSITORY');

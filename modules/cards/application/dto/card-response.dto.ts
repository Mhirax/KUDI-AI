import { Card } from '../../domain/entities/card.entity';

export class CardResponseDto {
  id: string;
  userId: string;
  accountId: string;
  type: string;
  status: string;
  last4: string | null;
  expiryMonth: string | null;
  expiryYear: string | null;
  brand: string | null;
  /** Major-unit decimal string — bigint minor units are never serialized directly. */
  balance: string;
  currency: string;
  createdAt: string;

  static fromDomain(card: Card): CardResponseDto {
    const props = card.toProps();
    return {
      id: props.id,
      userId: props.userId,
      accountId: props.accountId,
      type: props.type,
      status: props.status,
      last4: props.last4,
      expiryMonth: props.expiryMonth,
      expiryYear: props.expiryYear,
      brand: props.brand,
      balance: props.balance.toMajorUnitsString(),
      currency: props.currency,
      createdAt: props.createdAt.toISOString(),
    };
  }
}

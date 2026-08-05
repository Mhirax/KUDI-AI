import { Card as PrismaCard } from '@prisma/client';
import { Card } from '../../domain/entities/card.entity';
import { CardType } from '../../domain/enums/card-type.enum';
import { CardStatus } from '../../domain/enums/card-status.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

export class CardMapper {
  static toDomain(record: PrismaCard): Card {
    const currency = record.currency as Currency;
    return Card.reconstitute({
      id: record.id,
      userId: record.userId,
      accountId: record.accountId,
      type: record.type as CardType,
      status: record.status as CardStatus,
      providerCardId: record.providerCardId,
      last4: record.last4,
      expiryMonth: record.expiryMonth,
      expiryYear: record.expiryYear,
      brand: record.brand,
      balance: Money.fromMinorUnits(record.balanceMinorUnits, currency),
      currency,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(card: Card): PrismaCard {
    const props = card.toProps();
    return {
      id: props.id,
      userId: props.userId,
      accountId: props.accountId,
      type: props.type,
      status: props.status,
      providerCardId: props.providerCardId,
      last4: props.last4,
      expiryMonth: props.expiryMonth,
      expiryYear: props.expiryYear,
      brand: props.brand,
      balanceMinorUnits: props.balance.getMinorUnits(),
      currency: props.currency,
      version: props.version,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}

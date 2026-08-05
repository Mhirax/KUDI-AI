import { Inject, Injectable } from '@nestjs/common';
import { ICardIssuer, IssuedCardDetails } from '../../domain/services/card-issuer.interface';
import { CardProviderException } from '../../domain/exceptions/card-provider.exception';
import { Money } from '../../../../shared/value-objects/money.vo';
import {
  FLUTTERWAVE_VIRTUAL_CARDS_CLIENT,
  IFlutterwaveVirtualCardsClient,
} from '../../../../integrations/payment-gateway/flutterwave/virtual-cards/flutterwave-virtual-cards.port';
import { FlutterwaveVirtualCardsMapper } from '../../../../integrations/payment-gateway/flutterwave/virtual-cards/flutterwave-virtual-cards.mapper';

/**
 * Implements the Cards module's `ICardIssuer` port by delegating to
 * the Flutterwave Issuing integration adapter — mirror of Bills'
 * FlutterwaveBillPaymentProvider.
 */
@Injectable()
export class FlutterwaveCardIssuerService implements ICardIssuer {
  constructor(
    @Inject(FLUTTERWAVE_VIRTUAL_CARDS_CLIENT)
    private readonly client: IFlutterwaveVirtualCardsClient,
  ) {}

  async issueVirtualCard(params: {
    billingName: string;
    currency: string;
  }): Promise<IssuedCardDetails> {
    const response = await this.client.createCard({
      currency: params.currency,
      amount: 0,
      debit_currency: params.currency,
      billing_name: params.billingName,
    });

    if (response.status !== 'success' || !response.data) {
      throw new CardProviderException(response.message);
    }

    return FlutterwaveVirtualCardsMapper.toCardIssuanceDetails(response.data);
  }

  async fundCard(providerCardId: string, amount: Money): Promise<void> {
    const response = await this.client.fundCard(providerCardId, {
      amount: Number(amount.toMajorUnitsString()),
      debit_currency: amount.getCurrency(),
    });

    if (response.status !== 'success') {
      throw new CardProviderException(response.message);
    }
  }

  async blockCard(providerCardId: string): Promise<void> {
    const response = await this.client.blockCard(providerCardId);
    if (response.status !== 'success') {
      throw new CardProviderException(response.message);
    }
  }

  async unblockCard(providerCardId: string): Promise<void> {
    const response = await this.client.unblockCard(providerCardId);
    if (response.status !== 'success') {
      throw new CardProviderException(response.message);
    }
  }

  async terminateCard(providerCardId: string): Promise<void> {
    const response = await this.client.terminateCard(providerCardId);
    if (response.status !== 'success') {
      throw new CardProviderException(response.message);
    }
  }
}

import { Money } from '../../../../shared/value-objects/money.vo';

export interface IssuedCardDetails {
  providerCardId: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  brand: string;
}

/**
 * Domain service port for the virtual-card issuing provider
 * (Flutterwave Issuing). Same seam pattern as Bills'
 * IBillPaymentProvider — the concrete implementation wraps
 * /integrations/payment-gateway/flutterwave/virtual-cards.
 */
export interface ICardIssuer {
  issueVirtualCard(params: { billingName: string; currency: string }): Promise<IssuedCardDetails>;
  fundCard(providerCardId: string, amount: Money): Promise<void>;
  blockCard(providerCardId: string): Promise<void>;
  unblockCard(providerCardId: string): Promise<void>;
  terminateCard(providerCardId: string): Promise<void>;
}

export const CARD_ISSUER = Symbol('CARD_ISSUER');

import { Money } from '../../../../shared/value-objects/money.vo';
import { ExternalRecipient } from '../value-objects/external-recipient.vo';

export interface PayoutInitiationResult {
  providerReference: string;
  /** True if the provider confirmed completion synchronously (rare); false if awaiting webhook. */
  isImmediatelySettled: boolean;
}

/**
 * Port abstracting the external payout rail (Flutterwave) away from
 * the domain/application layers. The concrete implementation
 * (infrastructure/services/flutterwave-payout-provider.service.ts)
 * delegates to the Flutterwave integration adapter under
 * /integrations/payment-gateway/flutterwave/transfers.
 */
export interface IExternalPayoutProvider {
  initiatePayout(params: {
    reference: string;
    recipient: ExternalRecipient;
    amount: Money;
    narration: string;
  }): Promise<PayoutInitiationResult>;
}

export const EXTERNAL_PAYOUT_PROVIDER = Symbol('EXTERNAL_PAYOUT_PROVIDER');

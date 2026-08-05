import { Money } from '../../../../shared/value-objects/money.vo';

export interface VirtualAccountCreationResult {
  virtualAccountNumber: string;
  bankName: string;
}

export interface CheckoutInitiationResult {
  /** Hosted payment page the customer is redirected to. */
  paymentLink: string;
}

export interface VerifiedProviderTransaction {
  providerTransactionId: string;
  /** Our own tx_ref echoed back by the provider. */
  reference: string;
  amountMinorUnits: bigint;
  currency: string;
  isSuccessful: boolean;
}

/**
 * Domain service port for the funding provider (Flutterwave). The
 * concrete implementation wraps the integration adapter in
 * /integrations/payment-gateway/flutterwave/funding — same seam
 * pattern as Transfers' IExternalPayoutProvider.
 */
export interface IFundingProvider {
  createVirtualAccount(params: {
    reference: string;
    userEmail: string;
    userFullName: string;
    narration: string;
  }): Promise<VirtualAccountCreationResult>;

  initiateCheckout(params: {
    reference: string;
    amount: Money;
    userEmail: string;
    userFullName: string;
  }): Promise<CheckoutInitiationResult>;

  /**
   * Server-to-server re-verification of a transaction reported by
   * webhook. Webhook payloads are treated as *hints* only — amounts
   * and statuses used for crediting always come from this call.
   */
  verifyTransaction(providerTransactionId: string): Promise<VerifiedProviderTransaction>;
}

export const FUNDING_PROVIDER = Symbol('FUNDING_PROVIDER');

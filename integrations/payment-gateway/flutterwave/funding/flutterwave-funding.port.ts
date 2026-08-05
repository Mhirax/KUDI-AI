import {
  CreateFlutterwaveVirtualAccountRequest,
  FlutterwaveVirtualAccountResponse,
  InitiateFlutterwavePaymentRequest,
  FlutterwavePaymentResponse,
  FlutterwaveVerifyTransactionResponse,
} from './flutterwave-funding.dto';

/**
 * Port isolating callers from the concrete HTTP client used to reach
 * Flutterwave's funding-side APIs. `modules/funding` depends on this
 * interface (wrapped by its own domain-level `IFundingProvider` port),
 * never on `FlutterwaveFundingAdapter` directly — the same seam
 * pattern as ../transfers.
 */
export interface IFlutterwaveFundingClient {
  createVirtualAccountNumber(
    payload: CreateFlutterwaveVirtualAccountRequest,
  ): Promise<FlutterwaveVirtualAccountResponse>;
  initiatePayment(payload: InitiateFlutterwavePaymentRequest): Promise<FlutterwavePaymentResponse>;
  verifyTransaction(transactionId: string): Promise<FlutterwaveVerifyTransactionResponse>;
}

export const FLUTTERWAVE_FUNDING_CLIENT = Symbol('FLUTTERWAVE_FUNDING_CLIENT');

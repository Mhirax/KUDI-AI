import {
  CreateFlutterwaveVirtualCardRequest,
  FlutterwaveVirtualCardResponse,
  FundFlutterwaveVirtualCardRequest,
  FlutterwaveCardActionResponse,
} from './flutterwave-virtual-cards.dto';

/**
 * Port isolating callers from the concrete HTTP client for
 * Flutterwave's Issuing (virtual card) APIs. `modules/cards` depends
 * on this interface wrapped by its own domain-level `ICardIssuer`
 * port, never on the adapter directly — same seam pattern as
 * ../bill-payments and ../transfers.
 */
export interface IFlutterwaveVirtualCardsClient {
  createCard(payload: CreateFlutterwaveVirtualCardRequest): Promise<FlutterwaveVirtualCardResponse>;
  getCard(providerCardId: string): Promise<FlutterwaveVirtualCardResponse>;
  fundCard(
    providerCardId: string,
    payload: FundFlutterwaveVirtualCardRequest,
  ): Promise<FlutterwaveCardActionResponse>;
  blockCard(providerCardId: string): Promise<FlutterwaveCardActionResponse>;
  unblockCard(providerCardId: string): Promise<FlutterwaveCardActionResponse>;
  terminateCard(providerCardId: string): Promise<FlutterwaveCardActionResponse>;
}

export const FLUTTERWAVE_VIRTUAL_CARDS_CLIENT = Symbol('FLUTTERWAVE_VIRTUAL_CARDS_CLIENT');

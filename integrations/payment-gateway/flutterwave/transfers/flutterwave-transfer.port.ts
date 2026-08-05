import {
  InitiateFlutterwaveTransferRequest,
  FlutterwaveTransferResponse,
} from './flutterwave-transfer.dto';

/**
 * Port isolating callers from the concrete HTTP client used to reach
 * Flutterwave. `modules/transfers` depends on this interface (wrapped
 * by its own domain-level `IExternalPayoutProvider` port), never on
 * `FlutterwaveTransferAdapter` directly.
 */
export interface IFlutterwaveTransferClient {
  initiateTransfer(
    payload: InitiateFlutterwaveTransferRequest,
  ): Promise<FlutterwaveTransferResponse>;
  getTransferStatus(flutterwaveTransferId: string): Promise<FlutterwaveTransferResponse>;
}

export const FLUTTERWAVE_TRANSFER_CLIENT = Symbol('FLUTTERWAVE_TRANSFER_CLIENT');

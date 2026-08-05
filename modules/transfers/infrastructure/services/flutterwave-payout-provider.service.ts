import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IExternalPayoutProvider,
  PayoutInitiationResult,
} from '../../domain/services/external-payout-provider.interface';
import { Money } from '../../../../shared/value-objects/money.vo';
import { ExternalRecipient } from '../../domain/value-objects/external-recipient.vo';
import {
  FLUTTERWAVE_TRANSFER_CLIENT,
  IFlutterwaveTransferClient,
} from '../../../../integrations/payment-gateway/flutterwave/transfers/flutterwave-transfer.port';
import { FlutterwaveTransferMapper } from '../../../../integrations/payment-gateway/flutterwave/transfers/flutterwave-transfer.mapper';
import { PayoutProviderException } from '../../domain/exceptions/payout-provider.exception';

/**
 * Implements the Transfers module's own `IExternalPayoutProvider` port
 * by delegating to the Flutterwave integration adapter. This is the
 * seam between "Transfers knows it needs to pay someone out" and
 * "here is exactly how Flutterwave's API works" — the latter is fully
 * contained in /integrations/payment-gateway/flutterwave/transfers.
 */
@Injectable()
export class FlutterwavePayoutProvider implements IExternalPayoutProvider {
  constructor(
    @Inject(FLUTTERWAVE_TRANSFER_CLIENT) private readonly client: IFlutterwaveTransferClient,
    private readonly configService: ConfigService,
  ) {}

  async initiatePayout(params: {
    reference: string;
    recipient: ExternalRecipient;
    amount: Money;
    narration: string;
  }): Promise<PayoutInitiationResult> {
    const callbackUrl = this.configService.get<string>(
      'flutterwave.transferCallbackUrl',
      'https://api.kudiaibank.com/webhooks/flutterwave/transfers',
    );

    const providerRequest = FlutterwaveTransferMapper.toProviderRequest({
      bankCode: params.recipient.getBankCode(),
      accountNumber: params.recipient.getAccountNumber(),
      amountMajorUnits: params.amount.toMajorUnitsString(),
      currency: params.amount.getCurrency(),
      reference: params.reference,
      narration: params.narration,
      callbackUrl,
    });

    const response = await this.client.initiateTransfer(providerRequest);

    if (response.status !== 'success' || !response.data) {
      throw new PayoutProviderException(response.message);
    }

    return {
      providerReference: FlutterwaveTransferMapper.extractProviderReference(response.data),
      isImmediatelySettled: FlutterwaveTransferMapper.isTerminalSuccess(response.data),
    };
  }
}

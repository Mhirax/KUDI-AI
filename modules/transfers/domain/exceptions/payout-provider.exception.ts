import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Raised when the external payout provider (Flutterwave) rejects or
 * fails to process a payout request synchronously. Mapped to 502 Bad
 * Gateway — the failure is on the upstream provider's side, not a
 * client input error.
 */
export class PayoutProviderException extends DomainException {
  public readonly httpStatus = HttpStatus.BAD_GATEWAY;

  constructor(providerMessage: string) {
    super(`Payout provider rejected the transfer: ${providerMessage}`, 'PAYOUT_PROVIDER_ERROR');
    this.name = 'PayoutProviderException';
  }
}

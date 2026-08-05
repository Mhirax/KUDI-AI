import { DepositResponseDto } from './deposit-response.dto';

export class CheckoutSessionResponseDto {
  deposit: DepositResponseDto;
  /** Flutterwave hosted payment page to redirect the customer to. */
  paymentLink: string;
}

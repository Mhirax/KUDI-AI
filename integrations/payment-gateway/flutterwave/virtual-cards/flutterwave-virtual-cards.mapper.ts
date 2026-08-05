import { FlutterwaveVirtualCardData } from './flutterwave-virtual-cards.dto';

/**
 * Translation between Flutterwave's Issuing vocabulary and the
 * platform's Card aggregate fields.
 */
export class FlutterwaveVirtualCardsMapper {
  static toCardIssuanceDetails(data: FlutterwaveVirtualCardData): {
    providerCardId: string;
    last4: string;
    expiryMonth: string;
    expiryYear: string;
    brand: string;
  } {
    const [expiryMonth, expiryYear] = (data.expiration ?? '01/00').split('/');
    return {
      providerCardId: data.id ?? '',
      last4: data.last_4digits ?? '0000',
      expiryMonth,
      expiryYear,
      // Flutterwave issuing cards are Verve/Mastercard depending on
      // program configuration; not returned explicitly by this
      // endpoint, so default to the platform's configured scheme.
      brand: 'VERVE',
    };
  }
}

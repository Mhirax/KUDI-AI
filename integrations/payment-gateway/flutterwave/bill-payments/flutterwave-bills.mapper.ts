import { FlutterwaveBillerItem } from './flutterwave-bills.dto';
import { MINOR_UNIT_MULTIPLIER } from '../../../../shared/constants';

/**
 * Translation between Flutterwave's bills vocabulary and platform
 * categories/amounts. Category mapping is intentionally explicit — an
 * unmapped provider category is dropped rather than guessed.
 */
export class FlutterwaveBillsMapper {
  /** Platform category → Flutterwave `type` used in the payment request and catalogue queries. */
  static readonly CATEGORY_TO_PROVIDER_TYPE: Record<string, string> = {
    AIRTIME: 'AIRTIME',
    MOBILE_DATA: 'MOBILEDATA',
    ELECTRICITY: 'UTILITYBILLS',
    CABLE_TV: 'CABLEBILLS',
    INTERNET: 'INTBILLS',
  };

  static toCatalogueQuery(platformCategory: string): string {
    const providerType = this.CATEGORY_TO_PROVIDER_TYPE[platformCategory];
    // Flutterwave's catalogue endpoint filters via flags/param per type.
    switch (providerType) {
      case 'AIRTIME':
        return 'airtime=1';
      case 'MOBILEDATA':
        return 'data_bundle=1';
      case 'UTILITYBILLS':
        return 'power=1';
      case 'CABLEBILLS':
        return 'cables=1';
      case 'INTBILLS':
        return 'internet=1';
      default:
        return '';
    }
  }

  /** Provider amounts are major-unit JSON numbers; 0 means variable-amount. */
  static fixedAmountToMinorUnits(amount: number): bigint | null {
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    const [whole, fraction = ''] = amount.toFixed(2).split('.');
    return BigInt(whole) * BigInt(MINOR_UNIT_MULTIPLIER) + BigInt(fraction);
  }

  static isValidationSuccessful(responseCode: string | undefined, status: string): boolean {
    return status === 'success' && (responseCode === undefined || responseCode === '00');
  }

  static extractProviderReference(data: {
    flw_ref?: string;
    reference?: string | null;
    tx_ref?: string;
  }): string {
    return data.flw_ref ?? data.reference ?? data.tx_ref ?? '';
  }

  static isTerminalSuccessStatus(status: string | undefined): boolean {
    return (
      (status ?? '').toLowerCase() === 'successful' || (status ?? '').toLowerCase() === 'success'
    );
  }

  static isTerminalFailureStatus(status: string | undefined): boolean {
    const normalized = (status ?? '').toLowerCase();
    return normalized === 'failed' || normalized === 'error';
  }

  static toBillerItem(item: FlutterwaveBillerItem, platformCategory: string) {
    return {
      billerCode: item.biller_code,
      itemCode: item.item_code,
      name: item.name,
      category: platformCategory,
      fixedAmountMinorUnits: this.fixedAmountToMinorUnits(item.amount),
    };
  }
}

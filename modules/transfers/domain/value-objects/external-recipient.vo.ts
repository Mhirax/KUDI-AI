import { DomainException } from '../../../../shared/exceptions/domain.exception';

const BANK_CODE_REGEX = /^\d{3}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{10}$/;

/**
 * ExternalRecipient Value Object.
 *
 * Groups the destination details required for an outbound Flutterwave
 * payout: the recipient's Nigerian bank code (3-digit CBN code, e.g.
 * "044" for Access Bank) and their 10-digit NUBAN account number.
 * `accountName` is optional at construction — it is typically
 * confirmed via Flutterwave's account-resolution endpoint before a
 * payout is initiated (a future enhancement of this module) and is
 * carried here mainly for narration/display purposes.
 */
export class ExternalRecipient {
  private constructor(
    private readonly bankCode: string,
    private readonly accountNumber: string,
    private readonly accountName: string | null,
  ) {}

  static create(params: {
    bankCode: string;
    accountNumber: string;
    accountName?: string;
  }): ExternalRecipient {
    if (!params.bankCode || !BANK_CODE_REGEX.test(params.bankCode)) {
      throw new DomainException(
        `Invalid bank code, expected 3 digits: ${params.bankCode}`,
        'INVALID_BANK_CODE',
      );
    }
    if (!params.accountNumber || !ACCOUNT_NUMBER_REGEX.test(params.accountNumber)) {
      throw new DomainException(
        `Invalid recipient account number, expected 10 digits: ${params.accountNumber}`,
        'INVALID_RECIPIENT_ACCOUNT_NUMBER',
      );
    }
    return new ExternalRecipient(params.bankCode, params.accountNumber, params.accountName ?? null);
  }

  getBankCode(): string {
    return this.bankCode;
  }

  getAccountNumber(): string {
    return this.accountNumber;
  }

  getAccountName(): string | null {
    return this.accountName;
  }
}

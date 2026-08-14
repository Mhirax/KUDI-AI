import { AccountNumber } from '../value-objects/account-number.vo';

/**
 * Port abstracting NUBAN account-number generation (bank-code prefix +
 * serial + mod-10 checksum digit) away from the application layer.
 * Concrete implementation lives in infrastructure/services.
 */
export interface IAccountNumberGenerator {
  generate(): Promise<AccountNumber>;
}

export const ACCOUNT_NUMBER_GENERATOR = Symbol('ACCOUNT_NUMBER_GENERATOR');

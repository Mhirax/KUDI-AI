import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { IAccountNumberGenerator } from '../../domain/services/account-number-generator.interface';
import { AccountNumber } from '../../domain/value-objects/account-number.vo';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../domain/repositories/account.repository.interface';

// Standard NUBAN check-digit weighting per digit position 1..9
// (3-digit bank code + 6-digit serial). See CBN/NIBSS NUBAN spec.
const NUBAN_WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3];
const MAX_GENERATION_ATTEMPTS = 10;

/**
 * Generates NUBAN-format (10-digit) account numbers: a configured
 * 3-digit bank code, a random 6-digit serial, and a mod-10 weighted
 * checksum digit, retrying on the (extremely unlikely) event of a
 * collision against existing accounts.
 *
 * The exact checksum formula here follows the publicly documented
 * NUBAN weighting scheme; before connecting to real interbank rails
 * (NIBSS), this must be validated against Kudi AI Bank's officially
 * assigned bank code and NIBSS's certification test vectors.
 */
@Injectable()
export class NubanAccountNumberGenerator implements IAccountNumberGenerator {
  constructor(
    private readonly configService: ConfigService,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
  ) {}

  async generate(): Promise<AccountNumber> {
    const bankCode = this.configService.get<string>('bank.nubanCode', '999');

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const serial = randomInt(0, 1_000_000).toString().padStart(6, '0');
      const candidate = this.buildWithChecksum(bankCode, serial);
      const accountNumber = AccountNumber.create(candidate);

      const exists = await this.accountRepository.existsByAccountNumber(accountNumber);
      if (!exists) {
        return accountNumber;
      }
    }

    throw new InternalServerErrorException(
      'Unable to generate a unique account number after multiple attempts',
    );
  }

  private buildWithChecksum(bankCode: string, serial: string): string {
    const digits = `${bankCode}${serial}`.split('').map(Number);
    const sum = digits.reduce((acc, digit, index) => acc + digit * NUBAN_WEIGHTS[index], 0);
    const remainder = sum % 10;
    const checkDigit = remainder === 0 ? 0 : 10 - remainder;
    return `${bankCode}${serial}${checkDigit}`;
  }
}

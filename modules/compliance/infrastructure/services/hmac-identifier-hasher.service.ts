import { createHmac } from 'crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IIdentifierHasher } from '../../domain/services/identifier-hasher.interface';

const MIN_KEY_LENGTH = 32;

/**
 * HMAC-SHA256 implementation of `IIdentifierHasher`, keyed by
 * `KYC_IDENTIFIER_HMAC_KEY`. Replaces an earlier unkeyed
 * `sha256(bvn)`/`sha256(nin)` digest — plain SHA-256 over an 11-digit
 * identifier is brute-forceable offline (only 10^11 possible values),
 * since the digest itself is enough to test candidates against with no
 * rate limit. A keyed HMAC can't be attacked that way without the key.
 *
 * Deliberately not validated at module bootstrap — matches this
 * codebase's existing convention for provider secrets (e.g.
 * Flutterwave's config is read the same lazy way); misconfiguration
 * surfaces on first use via a 500, not a separate startup check.
 */
@Injectable()
export class HmacIdentifierHasher implements IIdentifierHasher {
  constructor(private readonly configService: ConfigService) {}

  hash(value: string): string {
    const key = this.configService.get<string>('kyc.identifierHmacKey');
    if (!key || key.length < MIN_KEY_LENGTH) {
      throw new InternalServerErrorException(
        `KYC_IDENTIFIER_HMAC_KEY must be configured and at least ${MIN_KEY_LENGTH} characters`,
      );
    }
    return createHmac('sha256', key).update(value).digest('hex');
  }
}

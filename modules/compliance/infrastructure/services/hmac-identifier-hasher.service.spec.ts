import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { HmacIdentifierHasher } from './hmac-identifier-hasher.service';

function fakeConfigService(identifierHmacKey: string | undefined): ConfigService {
  return { get: () => identifierHmacKey } as unknown as ConfigService;
}

describe('HmacIdentifierHasher', () => {
  const validKey = 'a'.repeat(32);

  it('is deterministic — the same value always hashes the same', () => {
    const hasher = new HmacIdentifierHasher(fakeConfigService(validKey));
    expect(hasher.hash('12345678901')).toBe(hasher.hash('12345678901'));
  });

  it('is actually keyed, not just wrapping plain SHA-256', () => {
    const hasherA = new HmacIdentifierHasher(fakeConfigService(validKey));
    const hasherB = new HmacIdentifierHasher(fakeConfigService('b'.repeat(32)));
    expect(hasherA.hash('12345678901')).not.toBe(hasherB.hash('12345678901'));

    // If it were an unkeyed digest, this would match regardless of key.
    const plainSha256 = createHash('sha256').update('12345678901').digest('hex');
    expect(hasherA.hash('12345678901')).not.toBe(plainSha256);
  });

  it('throws when the key is missing', () => {
    const hasher = new HmacIdentifierHasher(fakeConfigService(undefined));
    expect(() => hasher.hash('12345678901')).toThrow(InternalServerErrorException);
  });

  it('throws when the key is shorter than 32 characters', () => {
    const hasher = new HmacIdentifierHasher(fakeConfigService('too-short'));
    expect(() => hasher.hash('12345678901')).toThrow(InternalServerErrorException);
  });
});

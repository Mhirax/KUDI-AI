import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * AES-256-GCM helper for encrypting sensitive at-rest fields (BVN, NIN,
 * card PANs, etc.). Key management is delegated to a secrets manager in
 * production (see infrastructure/security/README.md).
 */
export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';

  static encrypt(plainText: string, key: Buffer): { iv: string; content: string; tag: string } {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    return {
      iv: iv.toString('hex'),
      content: encrypted.toString('hex'),
      tag: cipher.getAuthTag().toString('hex'),
    };
  }

  static decrypt(payload: { iv: string; content: string; tag: string }, key: Buffer): string {
    const decipher = createDecipheriv(this.ALGORITHM, key, Buffer.from(payload.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.content, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}

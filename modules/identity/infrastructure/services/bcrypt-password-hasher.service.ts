import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IPasswordHasher } from '../../domain/services/password-hasher.interface';

const SALT_ROUNDS = 12;

/**
 * bcrypt-backed implementation of `IPasswordHasher`. Cost factor of 12
 * balances brute-force resistance against acceptable request latency
 * for a login-critical path; re-evaluate periodically as hardware
 * improves (target ~250ms per hash on production instance types).
 */
@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher {
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}

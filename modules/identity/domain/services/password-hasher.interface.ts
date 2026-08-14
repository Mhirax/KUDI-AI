/**
 * Port abstracting the password hashing algorithm (bcrypt/argon2) away
 * from the domain and application layers.
 */
export interface IPasswordHasher {
  hash(plainText: string): Promise<string>;
  compare(plainText: string, hash: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface IIdentifierHasher {
  /**
   * Produces a deterministic, one-way digest of a raw identity
   * identifier (BVN/NIN) suitable for deduplication/lookup — never
   * the identifier itself. Deterministic so the same identifier always
   * hashes to the same value (required for the DB uniqueness/dedup use
   * case), but keyed so the digest can't be brute-forced offline
   * against the small identifier space (11-digit BVN/NIN is only 10^11
   * possibilities) the way an unkeyed hash can.
   */
  hash(value: string): string;
}

export const IDENTIFIER_HASHER = Symbol('IDENTIFIER_HASHER');

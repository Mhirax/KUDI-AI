import { Inject, Injectable } from '@nestjs/common';
import {
  ISanctionsScreeningProvider,
  SanctionsScreeningResult,
  SanctionsScreeningMatch,
} from '../../domain/services/sanctions-screening-provider.interface';
import {
  SANCTIONS_LIST_REPOSITORY,
  ISanctionsListRepository,
} from '../../domain/repositories/sanctions-list.repository.interface';

/** Tokens shorter than this are dropped as noise (initials, "DE", "VAN", etc. still pass at 2). */
const MIN_TOKEN_LENGTH = 2;

function normalizeToTokens(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[^A-Z\s'-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);
}

function candidateIsSubsetOfEntry(candidateTokens: string[], entryTokens: string[]): boolean {
  const entryTokenSet = new Set(entryTokens);
  return candidateTokens.every((token) => entryTokenSet.has(token));
}

/**
 * Screens a name against the seeded OFAC SDN individuals list (Phase 4a
 * of modules/compliance/implementation.md). Matching is deliberately
 * permissive, not strict — unlike `FlutterwaveVerificationMapper.namesMatch()`
 * (identity verification, where a false pass is the dangerous
 * direction), sanctions screening's dangerous direction is a false
 * *negative*: a missed match. A false positive here just costs a
 * compliance officer a quick, cheap manual-review dismissal (Phase 4b/5);
 * a missed real match is the actual AML risk. So: token-set matching
 * (order-independent, catches "LASTNAME, First Middle" vs "First
 * Last" formatting differences) rather than exact-string comparison,
 * and a candidate counts as a hit whenever *all* of their own name
 * tokens appear somewhere in a watchlist entry's tokens.
 *
 * Loads the full individuals list per call rather than filtering in
 * SQL — see `ISanctionsListRepository.findAllIndividuals()`'s doc
 * comment for why that's fine at today's list size.
 */
@Injectable()
export class OfacSanctionsScreeningProvider implements ISanctionsScreeningProvider {
  constructor(
    @Inject(SANCTIONS_LIST_REPOSITORY) private readonly sanctionsListRepository: ISanctionsListRepository,
  ) {}

  async screen(fullName: string): Promise<SanctionsScreeningResult> {
    const candidateTokens = normalizeToTokens(fullName);

    // A single-token name (or empty) can't be screened without an
    // unacceptable false-positive rate against a list this size —
    // treat as clean rather than flooding the review queue with noise.
    if (candidateTokens.length < 2) {
      return { matched: false, matches: [] };
    }

    const entries = await this.sanctionsListRepository.findAllIndividuals();
    const matches: SanctionsScreeningMatch[] = [];

    for (const entry of entries) {
      const entryTokens = normalizeToTokens(entry.fullName);
      if (candidateIsSubsetOfEntry(candidateTokens, entryTokens)) {
        matches.push({ entryId: entry.id, fullName: entry.fullName, program: entry.program });
      }
    }

    return { matched: matches.length > 0, matches };
  }
}

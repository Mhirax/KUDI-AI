export interface SanctionsScreeningMatch {
  entryId: string;
  fullName: string;
  program: string | null;
}

export interface SanctionsScreeningResult {
  matched: boolean;
  matches: SanctionsScreeningMatch[];
}

/**
 * Port abstracting the sanctions/PEP watchlist source away from the
 * application layer — the same shape as `IIdentityVerificationProvider`
 * abstracts Flutterwave. The current implementation
 * (`OfacSanctionsScreeningProvider`) screens against a seeded snapshot
 * of the free OFAC SDN list; a paid aggregator (ComplyAdvantage,
 * Refinitiv World-Check, etc.) could replace it later without any
 * application/domain code changing. See
 * modules/compliance/implementation.md, Phase 4a, and
 * infrastructure/prisma/data/README.md for the current data source.
 */
export interface ISanctionsScreeningProvider {
  screen(fullName: string): Promise<SanctionsScreeningResult>;
}

export const SANCTIONS_SCREENING_PROVIDER = Symbol('SANCTIONS_SCREENING_PROVIDER');

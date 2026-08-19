export interface SanctionsListEntry {
  id: string;
  source: string;
  externalId: string;
  fullName: string;
  program: string | null;
  remarks: string | null;
}

export interface ISanctionsListRepository {
  /**
   * The full individuals watchlist, unfiltered. Small enough (a few
   * thousand rows for the seeded OFAC SDN individuals list) to load
   * wholesale per screening call rather than push matching into SQL —
   * see `OfacSanctionsScreeningProvider` for why. Revisit if/when a
   * larger source list makes that not true anymore.
   */
  findAllIndividuals(): Promise<SanctionsListEntry[]>;
}

export const SANCTIONS_LIST_REPOSITORY = Symbol('SANCTIONS_LIST_REPOSITORY');

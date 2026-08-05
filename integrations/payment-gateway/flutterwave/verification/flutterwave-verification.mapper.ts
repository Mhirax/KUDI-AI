import { FlutterwaveBvnData, FlutterwaveNinData } from './flutterwave-verification.dto';

/**
 * Normalizes and compares names returned by Flutterwave's verification
 * endpoints against a user's registered name. Uses exact
 * case/whitespace-insensitive matching on first and last name — a
 * deliberately conservative baseline. Real-world identity data has
 * transliteration and ordering variance (e.g. middle names, compound
 * surnames); a production system would likely want fuzzy matching
 * (e.g. Levenshtein distance with a threshold) and a manual-review
 * fallback for near-misses rather than an outright pass/fail. That
 * refinement is intentionally deferred — this baseline never produces
 * a false *pass*, only a stricter false *mismatch*, which is the safer
 * direction to err in for identity fraud prevention.
 */
export class FlutterwaveVerificationMapper {
  static namesMatch(
    data: FlutterwaveBvnData | FlutterwaveNinData,
    expectedFirstName: string,
    expectedLastName: string,
  ): boolean {
    const normalize = (value: string) => value.trim().toLowerCase();
    return (
      normalize(data.first_name) === normalize(expectedFirstName) &&
      normalize(data.last_name) === normalize(expectedLastName)
    );
  }

  static fullName(data: FlutterwaveBvnData | FlutterwaveNinData): string {
    const parts = [data.first_name, data.middle_name, data.last_name].filter(Boolean);
    return parts.join(' ');
  }
}

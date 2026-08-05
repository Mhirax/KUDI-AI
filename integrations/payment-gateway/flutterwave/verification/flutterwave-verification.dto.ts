/**
 * Shapes for Flutterwave's v3 KYC resolution endpoints
 * (BVN: `GET /v3/kyc/bvns/{bvn}`). The NIN endpoint's exact path and
 * field names are modeled analogously here and should be verified
 * against Flutterwave's current documentation before production use —
 * NIN resolution availability and contract details are more recently
 * introduced and more likely to have changed than the long-standing
 * BVN endpoint.
 */

export interface FlutterwaveBvnData {
  bvn: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string;
  mobile: string | null;
}

export interface FlutterwaveNinData {
  nin: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string;
  mobile: string | null;
}

export interface FlutterwaveVerificationResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T | null;
}

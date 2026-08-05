import {
  FlutterwaveBvnData,
  FlutterwaveNinData,
  FlutterwaveVerificationResponse,
} from './flutterwave-verification.dto';

export interface IFlutterwaveVerificationClient {
  resolveBvn(bvn: string): Promise<FlutterwaveVerificationResponse<FlutterwaveBvnData>>;
  resolveNin(nin: string): Promise<FlutterwaveVerificationResponse<FlutterwaveNinData>>;
}

export const FLUTTERWAVE_VERIFICATION_CLIENT = Symbol('FLUTTERWAVE_VERIFICATION_CLIENT');

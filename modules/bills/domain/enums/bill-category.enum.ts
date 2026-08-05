/**
 * Platform-level bill categories, mapped to Flutterwave biller types
 * by the integration mapper. Kept deliberately coarser than the
 * provider's catalogue — new categories are additive.
 */
export enum BillCategory {
  AIRTIME = 'AIRTIME',
  MOBILE_DATA = 'MOBILE_DATA',
  ELECTRICITY = 'ELECTRICITY',
  CABLE_TV = 'CABLE_TV',
  INTERNET = 'INTERNET',
}

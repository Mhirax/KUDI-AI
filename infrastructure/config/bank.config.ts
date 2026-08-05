import { registerAs } from '@nestjs/config';

/**
 * Kudi AI Bank's own institutional identifiers, used when generating
 * NUBAN account numbers and, in a later phase, when initiating
 * interbank transfers via Flutterwave/NIBSS.
 */
export default registerAs('bank', () => ({
  nubanCode: process.env.BANK_NUBAN_CODE || '999',
  name: process.env.BANK_NAME || 'Kudi AI Bank',
}));

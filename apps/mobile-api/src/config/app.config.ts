import { registerAs } from '@nestjs/config';

/**
 * Application-level configuration namespace for Mobile API.
 */
export default registerAs('app', () => ({
  name: 'mobile-api',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
}));

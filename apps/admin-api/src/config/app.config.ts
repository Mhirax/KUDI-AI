import { registerAs } from '@nestjs/config';

/**
 * Application-level configuration namespace for Admin API.
 */
export default registerAs('app', () => ({
  name: 'admin-api',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3003', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
}));

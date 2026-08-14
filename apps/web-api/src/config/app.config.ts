import { registerAs } from '@nestjs/config';

/**
 * Application-level configuration namespace for Web API.
 */
export default registerAs('app', () => ({
  name: 'web-api',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
}));

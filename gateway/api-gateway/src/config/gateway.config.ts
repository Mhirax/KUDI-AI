import { registerAs } from '@nestjs/config';

export default registerAs('gateway', () => ({
  port: parseInt(process.env.GATEWAY_PORT || '8080', 10),
  upstreams: {
    mobileApi: process.env.MOBILE_API_URL || 'http://mobile-api:3001',
    webApi: process.env.WEB_API_URL || 'http://web-api:3002',
    adminApi: process.env.ADMIN_API_URL || 'http://admin-api:3003',
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
}));

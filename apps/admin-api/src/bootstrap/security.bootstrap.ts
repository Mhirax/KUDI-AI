import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Centralized security bootstrap hook: helmet, CORS, rate limiting, etc.
 */
export function bootstrapSecurity(app: INestApplication): void {
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });
}

/**
 * Admin API - Application Entrypoint
 * Kudi AI Bank - Enterprise Banking Platform
 *
 * This bootstraps the Admin API microservice. Business logic, controllers,
 * and route handlers are intentionally omitted in Phase 1 (foundation only).
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { bootstrapLogger } from './bootstrap/logger.bootstrap';
import { bootstrapSecurity } from './bootstrap/security.bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  bootstrapLogger(app);
  bootstrapSecurity(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  const port = process.env.PORT || 3003;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[Admin API] listening on port ${port}`);
}

bootstrap();

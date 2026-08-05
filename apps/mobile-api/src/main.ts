/**
 * Mobile API - Application Entrypoint
 * Kudi AI Bank - Enterprise Banking Platform
 *
 * Bootstraps the Mobile API microservice: logging, security (helmet/CORS),
 * the global `api/v1` prefix, request validation, and OpenAPI/Swagger,
 * then starts listening.
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { bootstrapLogger } from './bootstrap/logger.bootstrap';
import { bootstrapSecurity } from './bootstrap/security.bootstrap';
import { bootstrapSwagger } from './bootstrap/swagger.bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  bootstrapLogger(app);
  bootstrapSecurity(app);

  // Every route (except any future `exclude`-listed paths) is served
  // under this prefix, matching the versioned contract every app.config.ts
  // already declared (`apiPrefix: 'api/v1'`) — see Backend Fix Log, Gap 1.
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  bootstrapSwagger(app, apiPrefix);

  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[Mobile API] listening on port ${port}`);
  // eslint-disable-next-line no-console
  console.log(`[Mobile API] API prefix: /${apiPrefix} — docs at /${apiPrefix}/docs`);
}

void bootstrap();

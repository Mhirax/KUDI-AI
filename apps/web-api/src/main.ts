/**
 * Web API - Application Entrypoint
 * Kudi AI Bank - Enterprise Banking Platform
 *
 * This bootstraps the Web API microservice. Business logic, controllers,
 * and route handlers are intentionally omitted in Phase 1 (foundation only).
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix, { exclude: ['health'] });

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Kudi AI Bank - Web API')
      .setDescription('Web API for Kudi AI Bank (identity, accounts, transfers, compliance)')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, swaggerDocument);
  }

  app.enableShutdownHooks();

  const port = process.env.PORT || 3002;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[Web API] listening on port ${port}`);
}

bootstrap();

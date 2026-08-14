/**
 * Kudi AI Bank — API Gateway
 *
 * Single entry point for external traffic. Routes to mobile-api, web-api,
 * and admin-api. Hosts cross-cutting middleware, guards, interceptors,
 * filters, and pipes shared across all upstream services.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = process.env.GATEWAY_PORT || 8080;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api-gateway] listening on port ${port}`);
}

bootstrap();

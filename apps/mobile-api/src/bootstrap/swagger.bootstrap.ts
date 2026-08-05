import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Centralized OpenAPI/Swagger bootstrap hook.
 *
 * Mounted at `${apiPrefix}/docs` (e.g. /api/v1/docs) so the interactive
 * UI lives under the same versioned path as the API itself. Must be
 * called *after* `app.setGlobalPrefix()` so the generated document's
 * base path and the UI route stay consistent with every other route.
 */
export function bootstrapSwagger(app: INestApplication, apiPrefix: string): void {
  const config = new DocumentBuilder()
    .setTitle('Kudi AI Bank — Mobile API')
    .setDescription(
      'Mobile API for Kudi AI Bank — identity, accounts, transfers, funding, bills, and compliance/KYC.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

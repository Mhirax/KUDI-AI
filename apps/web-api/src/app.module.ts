import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import { defaultThrottlerConfig } from '../../../infrastructure/config/throttler.config';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { IdentityModule } from '../../../modules/identity/identity.module';
import { AccountsModule } from '../../../modules/accounts/accounts.module';
import { TransfersModule } from '../../../modules/transfers/transfers.module';
import { ComplianceModule } from '../../../modules/compliance/compliance.module';
import { JwtAuthGuard } from '../../../gateway/guards/jwt-auth.guard';
import { HttpExceptionFilter } from '../../../gateway/filters/http-exception.filter';

/**
 * Root module. Business/domain modules are registered in `imports`
 * below as they are implemented; DatabaseModule is @Global() but must
 * still be imported once per application bootstrap context.
 *
 * `ThrottlerGuard` is registered globally first — a request is rate-
 * limited before any auth work happens. `JwtAuthGuard` follows: every
 * route requires a valid access token by default, except those
 * explicitly marked `@Public()` (registration, login, refresh,
 * Flutterwave webhooks). Secure-by-default over opt-in auth. See
 * infrastructure/config/throttler.config.ts for the rate-limit
 * thresholds (modules/compliance/implementation.md, Phase 2a).
 *
 * `HttpExceptionFilter` is registered globally so every thrown
 * `DomainException` (and standard NestJS `HttpException`) is
 * translated into the platform's consistent error envelope.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot(defaultThrottlerConfig),
    DatabaseModule,
    IdentityModule,
    AccountsModule,
    TransfersModule,
    ComplianceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}

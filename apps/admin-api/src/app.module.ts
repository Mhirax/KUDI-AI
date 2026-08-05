import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { IdentityModule } from '../../../modules/identity/identity.module';
import { AccountsModule } from '../../../modules/accounts/accounts.module';
import { TransfersModule } from '../../../modules/transfers/transfers.module';
import { ComplianceModule } from '../../../modules/compliance/compliance.module';
import { LedgerModule } from '../../../modules/ledger/ledger.module';
import { FundingModule } from '../../../modules/funding/funding.module';
import { BillsModule } from '../../../modules/bills/bills.module';
import { NotificationsModule } from '../../../modules/notifications/notifications.module';
import { SavingsModule } from '../../../modules/savings/savings.module';
import { LoansModule } from '../../../modules/loans/loans.module';
import { CardsModule } from '../../../modules/cards/cards.module';
import { RewardsModule } from '../../../modules/rewards/rewards.module';
import { JwtAuthGuard } from '../../../gateway/guards/jwt-auth.guard';
import { HttpExceptionFilter } from '../../../gateway/filters/http-exception.filter';

/**
 * Root module. Business/domain modules are registered in `imports`
 * below as they are implemented; DatabaseModule is @Global() but must
 * still be imported once per application bootstrap context.
 *
 * `JwtAuthGuard` is registered globally: every route requires a valid
 * access token by default, except those explicitly marked `@Public()`
 * (registration, login, refresh, Flutterwave webhooks). Secure-by-
 * default over opt-in auth.
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
    DatabaseModule,
    IdentityModule,
    AccountsModule,
    TransfersModule,
    ComplianceModule,
    LedgerModule,
    FundingModule,
    BillsModule,
    NotificationsModule,
    SavingsModule,
    LoansModule,
    CardsModule,
    RewardsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}

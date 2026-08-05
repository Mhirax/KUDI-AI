import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/**
 * Root module for the API Gateway.
 * Proxy/routing modules to downstream services are added in later phases.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
  ],
})
export class AppModule {}

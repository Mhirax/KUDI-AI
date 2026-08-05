import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import jwtConfig from '../../infrastructure/security/jwt.config';

// Domain ports
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository.interface';
import { PASSWORD_HASHER } from './domain/services/password-hasher.interface';

// Application ports
import { TOKEN_SERVICE } from './application/ports/token.service.interface';

// Infrastructure adapters
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository';
import { BcryptPasswordHasher } from './infrastructure/services/bcrypt-password-hasher.service';
import { JwtTokenService } from './infrastructure/services/jwt-token.service';

// Application command/query handlers
import { RegisterUserHandler } from './application/commands/register-user/register-user.handler';
import { LoginHandler } from './application/commands/login/login.handler';
import { RefreshAccessTokenHandler } from './application/commands/refresh-token/refresh-token.handler';
import { LogoutHandler } from './application/commands/logout/logout.handler';
import { ChangePasswordHandler } from './application/commands/change-password/change-password.handler';
import { GetUserByIdHandler } from './application/queries/get-user-by-id/get-user-by-id.handler';
import { GetUserProfileHandler } from './application/queries/get-user-profile/get-user-profile.handler';

// Presentation
import { AuthController } from './presentation/controllers/auth.controller';
import { UsersController } from './presentation/controllers/users.controller';
import { JwtStrategy } from './presentation/strategies/jwt.strategy';

const commandHandlers = [
  RegisterUserHandler,
  LoginHandler,
  RefreshAccessTokenHandler,
  LogoutHandler,
  ChangePasswordHandler,
];

const queryHandlers = [GetUserByIdHandler, GetUserProfileHandler];

/**
 * Identity & Auth bounded-context module.
 *
 * Assembles all four Clean Architecture layers via Dependency
 * Injection: domain/application depend only on interfaces (tokens
 * below); this module is the single place where those interfaces are
 * bound to their concrete infrastructure implementations.
 *
 * `DatabaseModule` (global, registered in each app's root module) already
 * provides `PrismaService`; it is not re-imported here.
 */
@Module({
  imports: [
    CqrsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiresIn', '15m'),
          issuer: configService.get<string>('jwt.issuer'),
        },
      }),
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    JwtStrategy,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
  ],
  exports: [USER_REPOSITORY, TOKEN_SERVICE],
})
export class IdentityModule {}

import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { LoginCommand } from './login.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../../domain/repositories/refresh-token.repository.interface';
import { PASSWORD_HASHER, IPasswordHasher } from '../../../domain/services/password-hasher.interface';
import { TOKEN_SERVICE, ITokenService } from '../../ports/token.service.interface';
import { Email } from '../../../domain/value-objects/email.vo';
import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { InvalidCredentialsException } from '../../../domain/exceptions/invalid-credentials.exception';
import { AuthResponseDto } from '../../dto/auth-response.dto';

const REFRESH_TOKEN_TTL_DAYS = 7;

/**
 * Use case: authenticate a user with email/password and issue a new
 * access/refresh token pair. Every attempt — success or failure — is
 * recorded on the User aggregate, which owns the lockout policy.
 */
@Injectable()
@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, AuthResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: LoginCommand): Promise<AuthResponseDto> {
    const email = Email.create(command.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Perform a dummy hash comparison to keep response timing
      // consistent regardless of whether the email exists, mitigating
      // user-enumeration via timing side-channels.
      await this.passwordHasher.compare(command.password, '$2b$12$invalidsaltinvalidsaltinvalidsalt');
      throw new InvalidCredentialsException();
    }

    user.assertCanAttemptLogin();

    const passwordMatches = await this.passwordHasher.compare(
      command.password,
      user.passwordHash.getValue(),
    );

    if (!passwordMatches) {
      user.recordFailedLogin(command.ipAddress);
      await this.userRepository.save(user);
      user.pullDomainEvents().forEach((event) => this.eventBus.publish(event));
      throw new InvalidCredentialsException();
    }

    user.recordSuccessfulLogin(command.ipAddress, command.userAgent);
    await this.userRepository.save(user);

    const { token: accessToken, expiresIn } = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email.getValue(),
      role: user.role,
    });

    const rawRefreshToken = this.tokenService.generateOpaqueRefreshToken();
    const refreshTokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);

    const refreshToken = RefreshToken.issue({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
    });

    await this.refreshTokenRepository.save(refreshToken);

    user.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      accessTokenExpiresIn: expiresIn,
      user: {
        id: user.id,
        email: user.email.getValue(),
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
    };
  }
}

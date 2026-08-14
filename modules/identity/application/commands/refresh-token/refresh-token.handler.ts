import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RefreshAccessTokenCommand } from './refresh-token.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../../domain/repositories/refresh-token.repository.interface';
import { TOKEN_SERVICE, ITokenService } from '../../ports/token.service.interface';
import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { InvalidRefreshTokenException } from '../../../domain/exceptions/invalid-refresh-token.exception';
import { AuthResponseDto } from '../../dto/auth-response.dto';

const REFRESH_TOKEN_TTL_DAYS = 7;

/**
 * Use case: exchange a valid refresh token for a new access/refresh
 * pair, rotating the refresh token on every use.
 *
 * Reuse detection: if a *revoked* token is presented again, this is a
 * strong signal that the token was stolen and already used by an
 * attacker (or the legitimate owner raced a stale token) — the entire
 * token family is revoked, forcing re-authentication on all devices.
 */
@Injectable()
@CommandHandler(RefreshAccessTokenCommand)
export class RefreshAccessTokenHandler
  implements ICommandHandler<RefreshAccessTokenCommand, AuthResponseDto>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(command: RefreshAccessTokenCommand): Promise<AuthResponseDto> {
    const presentedHash = this.tokenService.hashRefreshToken(command.refreshToken);
    const existingToken = await this.refreshTokenRepository.findByTokenHash(presentedHash);

    if (!existingToken) {
      throw new InvalidRefreshTokenException();
    }

    if (existingToken.isRevoked()) {
      // Reuse of a revoked token — treat as compromise and kill the
      // whole family so every derived token becomes invalid.
      await this.refreshTokenRepository.revokeFamily(existingToken.family);
      throw new InvalidRefreshTokenException();
    }

    if (existingToken.isExpired()) {
      throw new InvalidRefreshTokenException();
    }

    const user = await this.userRepository.findById(existingToken.userId);
    if (!user) {
      throw new InvalidRefreshTokenException();
    }
    user.assertCanAttemptLogin();

    const newRawRefreshToken = this.tokenService.generateOpaqueRefreshToken();
    const newTokenHash = this.tokenService.hashRefreshToken(newRawRefreshToken);

    const newRefreshToken = RefreshToken.issue({
      userId: user.id,
      tokenHash: newTokenHash,
      family: existingToken.family,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
    });

    existingToken.revoke(newRefreshToken.id);
    await this.refreshTokenRepository.save(existingToken);
    await this.refreshTokenRepository.save(newRefreshToken);

    const { token: accessToken, expiresIn } = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email.getValue(),
      role: user.role,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
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

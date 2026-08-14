import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutCommand } from './logout.command';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../../domain/repositories/refresh-token.repository.interface';
import { TOKEN_SERVICE, ITokenService } from '../../ports/token.service.interface';

/**
 * Use case: log out a single session by revoking its refresh token
 * family, so both the presented token and any future rotations of it
 * become unusable. Access tokens remain valid until natural expiry
 * (short-lived by design) — this is the standard JWT-with-refresh
 * trade-off; a token-revocation deny-list may be added later if
 * immediate access-token invalidation becomes a requirement.
 */
@Injectable()
@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const tokenHash = this.tokenService.hashRefreshToken(command.refreshToken);
    const existingToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (existingToken && !existingToken.isRevoked()) {
      await this.refreshTokenRepository.revokeFamily(existingToken.family);
    }
    // Idempotent: logging out an already-invalid token is a no-op,
    // not an error — the end state the caller wants is already true.
  }
}
